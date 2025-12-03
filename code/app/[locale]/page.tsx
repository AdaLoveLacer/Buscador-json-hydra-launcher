"use client"

import type React from "react"

import { useState, useEffect, useMemo, useRef } from "react"
import { useTranslations } from "@/components/i18n-provider"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import SearchBar from "@/components/search-bar"
import AdvancedFilters from "@/components/advanced-filters"
import DownloadCard from "@/components/download-card"
import SearchStats from "@/components/search-stats"
import FileUploadDialog from "@/components/file-upload-dialog"
import SourcesManager from "@/components/sources-manager"
import { Card } from "@/components/ui/card"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination"
import { Search, Settings } from "lucide-react"
import { useLocale } from "@/components/i18n-provider"
import type { GogData } from "@/lib/types"
import { useDataState } from "@/hooks/use-data-state"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  type FilterState,
  processDownloads,
  processAndDeduplicateDownloads,
  isValidGogData,
  fetchWithTimeout,
  processedUrlLoads,
  recentlyRemovedUrls,
  failedUrlAt,
  processGogData,
  loadSources,
  markSourceAsRemoved,
  loadServerSource,
} from "@/lib/search"
import { createLogger } from "@/lib/logger"

const log = createLogger('page')

// usando tipos compartilhados

import { LoadingOverlay } from "@/components/loading-overlay"

export default function Home() {
  // Use o store global para todos os dados
  const { gogData: gogs, savedSources: storeSavedSources, addGogData, removeSource, loadSavedSource } = useDataState()
  const mountedRef = useRef(false)
  const [mounted, setMounted] = useState(false)
  const [page, setPage] = useState<number>(1)
  const PAGE_SIZE = 12
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("")
  const [activeTab, setActiveTab] = useState("search")
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    sortBy: "date",
    dateRange: {},
    sizeRange: {},
    searchMode: "all",
  })

  useEffect(() => {
    // mark client mount for interactive-only components (avoid Radix id mismatch)
    setMounted(true)

    // On first mount, load URL sources from central store once (avoid loops and races)
    if (mountedRef.current) return
    mountedRef.current = true

    const initialLoad = async () => {
      await loadSources(storeSavedSources || [], {
        onLoadStart: () => {
          setIsLoading(true)
          setLoadingMessage("Carregando fontes...")
        },
        onLoadEnd: () => {
          setIsLoading(false)
          setLoadingMessage("")
        },
        onAddData: (json, url) => {
          const sourceData = processGogData(json)
          addGogData(sourceData, url)
        },
        onError: (err) => {
          log.error('INITIAL-LOAD-FAILED', err)
        },
      })
    }

    initialLoad()
  }, [storeSavedSources, addGogData])

  // Ensure saved URL sources are loaded automatically on startup:
  // - if a source has a __serverId, prefer rehydrating from the server
  // - otherwise attempt a defensive fetch of the URL (same logic as Retry)
  useEffect(() => {
    if (!storeSavedSources || storeSavedSources.length === 0) return

    const stateApi = useDataState.getState()
    ;(async () => {
      for (const s of storeSavedSources) {
        try {
          // prefer server-stored copy when available for both URL and file types
          if (!s) continue

          // For URL sources keep existing behavior
          if (s.type === "url" && s.url) {
            const url = s.url
            if (processedUrlLoads.has(url)) continue

            // Skip if recently removed in this session
            if (recentlyRemovedUrls.has(url) || recentlyRemovedUrls.has(s.name || "")) {
              processedUrlLoads.add(url)
              continue
            }

            // If already present in memory, skip
            const already = gogs.some((g) => g.name === s.name)
            if (already) {
              processedUrlLoads.add(url)
              continue
            }

            if ((s as any).__serverId) {
              try {
                await stateApi.loadSavedSource(String((s as any).__serverId))
                processedUrlLoads.add(url)
                continue
              } catch (e) {
                log.warn('LOAD-SERVER-FAILED', { url, error: e })
              }
            }

            // fallback: attempt fetch from URL (defensive)
            try {
              const res = await fetchWithTimeout(url)
              if (!res || !res.ok) {
                failedUrlAt[url] = Date.now()
                continue
              }

              const text = await res.text().catch(() => "")
              const trimmed = text.trim()
              if (trimmed.startsWith("<")) {
                const contentType = (res.headers.get("content-type") || "").toLowerCase()
                log.warn('NON-JSON-RESPONSE', { url, contentType, sample: trimmed.slice(0, 200) })
                failedUrlAt[url] = Date.now()
                continue
              }

              let json: any
              try {
                json = JSON.parse(text)
              } catch (e) {
                log.warn('JSON-PARSE-FAILED', { url, sample: text.slice(0, 200) })
                failedUrlAt[url] = Date.now()
                continue
              }

              if (!isValidGogData(json)) {
                failedUrlAt[url] = Date.now()
                continue
              }

              const sourceData = processGogData(json)
              processedUrlLoads.add(url)
              addGogData(sourceData, url)
            } catch (err: any) {
              if (err && err.name === "AbortError") log.warn('FETCH-TIMEOUT', { url })
              else log.error('LOAD-SOURCE-FAILED', { url, error: err })
              failedUrlAt[url] = Date.now()
            }
            continue
          }

          // For file sources: prefer server copy if __serverId present, otherwise try to match by name
          if (s.type === "file") {
            // avoid restoring if already in memory
            const already = gogs.some((g) => g.name === s.name)
            if (already) continue

            // Try load from server with automatic retry and server list matching
            if (await loadServerSource(s, stateApi.loadSavedSource)) {
              continue
            }
          }
        } catch (e) {
          log.warn('AUTO-LOAD-FAILED', e)
        }
      }
    })()
  }, [storeSavedSources, gogs])

  useEffect(() => {
    // Periodic refresh: run every hour using the central savedSources snapshot
    let stopped = false

    // Função de atualização
    const periodicUpdate = () => {
      if (!stopped) {
        loadSources(storeSavedSources || [], {
          onAddData: (data, url) => addGogData(data, url),
          onError: (error) => {
            if (!stopped) log.error('PERIODIC-UPDATE-FAILED', error)
          },
        })
      }
    }

    const interval = setInterval(periodicUpdate, 60 * 60 * 1000) // Auto-update every hour
    periodicUpdate() // Execute immediately on mount

    return () => {
      stopped = true
      clearInterval(interval)
    }
  }, [storeSavedSources, addGogData])

  // NOTE: persistence of savedSources is handled centrally (e.g. zustand persist).
  // Avoid duplicating serialization here (can be expensive with large `data` blobs).

  // Controle de loading baseado em debounce (ÚNICO effect)
  useEffect(() => {
    if (filters.searchQuery.trim()) {
      setIsLoading(true)
      setLoadingMessage("Buscando...")

      const timer = setTimeout(() => {
        setIsLoading(false)
        setLoadingMessage("")
      }, 300) // Pequeno delay para evitar flickering

      return () => clearTimeout(timer)
    } else {
      // ✅ Agora também trata o caso de searchQuery vazio
      setIsLoading(false)
      setLoadingMessage("")
    }
  }, [filters.searchQuery])

  // ✅ BUG #2.2 FIX: Use async processing to avoid UI blocking
  // Previously: useMemo with synchronous processAndDeduplicateDownloads blocked the UI
  // Now: Use state + effect for non-blocking async processing
  const [allDownloads, setAllDownloads] = useState<ReturnType<typeof processAndDeduplicateDownloads>>([])
  const [isProcessingDedupe, setIsProcessingDedupe] = useState(false)
  
  useEffect(() => {
    if (!gogs || gogs.length === 0) {
      setAllDownloads([])
      return
    }

    setIsProcessingDedupe(true)
    log.debug('DEDUPE-START', { gogCount: gogs.length })
    
    // Use setTimeout to defer processing to next event loop iteration
    // This allows React to paint the loading state first
    const timer = setTimeout(() => {
      try {
        const result = processAndDeduplicateDownloads(gogs)
        setAllDownloads(result)
        log.debug('DEDUPE-DONE', { resultCount: result.length })
      } catch (e) {
        log.error('DEDUPE-ERROR', e)
      } finally {
        setIsProcessingDedupe(false)
      }
    }, 0)

    return () => clearTimeout(timer)
  }, [gogs])

  // ✅ BUG #2.2 FIX: Use async processing with debouncing
  // Previously: useMemo with synchronous processDownloads blocked the UI for 500ms+
  // Now: Use state + effect with debouncing for non-blocking async processing
  const [filteredDownloads, setFilteredDownloads] = useState<ReturnType<typeof processDownloads>>([])
  const [isProcessingFilters, setIsProcessingFilters] = useState(false)

  useEffect(() => {
    setIsProcessingFilters(true)
    log.debug('FILTER-START', { downloadCount: allDownloads.length, filters })
    
    // Debounce: wait 100ms before processing to batch multiple filter changes
    const timer = setTimeout(() => {
      try {
        const result = processDownloads(allDownloads, filters)
        setFilteredDownloads(result)
        log.debug('FILTER-DONE', { resultCount: result.length })
      } catch (e) {
        log.error('FILTER-ERROR', e)
      } finally {
        setIsProcessingFilters(false)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [allDownloads, filters])

  const handleFileUpload = (newGogData: GogData, sourceUrl?: string) => {
    addGogData(newGogData, sourceUrl)
  }

  const handleRemoveSource = async (sourceName: string) => {
    try {
      const ss = useDataState.getState().savedSources || []
      const found = ss.find((s: any) => s.name === sourceName)
      if (found) {
        markSourceAsRemoved(sourceName, found.url)
      }
      await removeSource(sourceName)
    } catch (error) {
      log.error('REMOVE-SOURCE-FAILED', error)
    }
  }

  // Paginação: calcular fatia atual a partir de filteredDownloads
  const totalPages = Math.max(1, Math.ceil(filteredDownloads.length / PAGE_SIZE))

  // Remove diagnósticos desnecessários

  useEffect(() => {
    // Resetar para página 1 quando filtros ou resultados mudarem significativamente
    setPage(1)
  }, [filteredDownloads.length, filters.searchQuery, filters.sortBy])

  const displayedDownloads = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredDownloads.slice(start, start + PAGE_SIZE)
  }, [filteredDownloads, page, PAGE_SIZE])

  const t = useTranslations()
  const currentLocale = useLocale()
  const pathname = usePathname() ?? "/"
  const searchParams = useSearchParams()
  const search = searchParams ? `?${searchParams.toString()}` : ""

  // supported locales for this app
  const supportedLocales = ["pt-BR", "en"]
  // remove any existing locale prefix from pathname
  const parts = pathname.split("/").filter(Boolean)
  const pathRest = parts.length > 0 && supportedLocales.includes(parts[0]) ? "/" + parts.slice(1).join("/") : pathname
  // Função para salvar o locale no cookie (lado do cliente)
  const saveLocaleCookie = (locale: string) => {
    if (typeof document !== "undefined") {
      document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`
    }
  }

  // Efeito para salvar o locale quando mudar
  useEffect(() => {
    saveLocaleCookie(currentLocale)
  }, [currentLocale])

  const buildLocaleHref = (targetLocale: string) => {
    const rest = pathRest === "/" ? "" : pathRest
    return `/${targetLocale}${rest}${search}`
  }

  return (
    <main className="min-h-screen bg-background">
      <LoadingOverlay isLoading={isLoading} message={loadingMessage} />
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-linear-to-br from-primary to-accent flex items-center justify-center shrink-0">
                <Search className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("header.title")}</h1>
                    <p className="text-sm text-muted-foreground">{t("header.subtitle")}</p>
                  </div>

                  <div className="ml-4 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground mr-2">{currentLocale}</span>
                    <Link href={buildLocaleHref("pt-BR")} className="text-sm hover:text-primary">
                      PT-BR
                    </Link>
                    <span className="text-sm text-muted-foreground">|</span>
                    <Link href={buildLocaleHref("en")} className="text-sm hover:text-primary">
                      EN
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            {mounted && <FileUploadDialog onFileUpload={handleFileUpload} />}
          </div>

          <SearchBar value={filters.searchQuery} onChange={(value) => setFilters({ ...filters, searchQuery: value })} />
        </div>
      </div>{" "}
      <div className="container mx-auto px-4 py-8">
        {mounted ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" data-page-tabs-id="main-tabs">
            <TabsList className="mb-6 bg-muted/50">
              <TabsTrigger value="search" className="gap-2" data-tab-id="main-search">
                <Search className="w-4 h-4" />
                {t("search.stats.tab")}
              </TabsTrigger>
              <TabsTrigger value="sources" className="gap-2" data-tab-id="main-sources">
                <Settings className="w-4 h-4" />
                {t("sources_manager.tab")} ({(storeSavedSources || []).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" data-tab-content-id="main-search-content">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-1">
                  <AdvancedFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    totalResults={filteredDownloads.length}
                  />
                </div>

                <div className="lg:col-span-4">
                  <SearchStats
                    total={allDownloads.length}
                    filtered={filteredDownloads.length}
                    query={filters.searchQuery}
                  />

                  {filteredDownloads.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {displayedDownloads.map((download) => (
                          <DownloadCard key={`${download.title}-${download.uploadDate}`} download={download} />
                        ))}
                      </div>

                      {filteredDownloads.length > PAGE_SIZE && (
                        <div className="mt-6">
                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    setPage((p) => Math.max(1, p - 1))
                                  }}
                                  aria-disabled={page === 1}
                                />
                              </PaginationItem>

                              {/* Renderizar um conjunto reduzido de botões (janela de páginas) */}
                              {(() => {
                                const maxButtons = 7
                                let start = Math.max(1, page - Math.floor(maxButtons / 2))
                                let end = start + maxButtons - 1
                                if (end > totalPages) {
                                  end = totalPages
                                  start = Math.max(1, end - maxButtons + 1)
                                }
                                const items: React.ReactNode[] = []
                                for (let p = start; p <= end; p++) {
                                  items.push(
                                    <PaginationItem key={p}>
                                      <PaginationLink
                                        href="#"
                                        isActive={p === page}
                                        onClick={(e) => {
                                          e.preventDefault()
                                          setPage(p)
                                        }}
                                      >
                                        {p}
                                      </PaginationLink>
                                    </PaginationItem>,
                                  )
                                }
                                return items
                              })()}

                              <PaginationItem>
                                <PaginationNext
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    setPage((p) => Math.min(totalPages, p + 1))
                                  }}
                                  aria-disabled={page === totalPages}
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      )}
                    </>
                  ) : (
                    <Card className="p-12 text-center bg-card border-border">
                      <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">{t("no_results.title")}</h3>
                      <p className="text-muted-foreground">{t("no_results.body")}</p>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sources" data-tab-content-id="main-sources-content">
              <SourcesManager sources={storeSavedSources || []} onRemoveSource={handleRemoveSource} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center min-h-[200px]">
            <LoadingOverlay isLoading={true} message={t("loading")} />
          </div>
        )}
      </div>
    </main>
  )
}
