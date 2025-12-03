"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Trash2, Globe, FileJson, RotateCw } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "@/components/i18n-provider"
import { useDataState } from "@/hooks/use-data-state"
import { createLogger } from "@/lib/logger"

const log = createLogger('sources-manager')

interface Source {
  name: string
  url: string
  type: "file" | "url"
  lastUpdated: string
  // optional cached data (offline copy)
  data?: any
}

export default function SourcesManager({
  sources,
  onRemoveSource,
}: {
  sources: Source[]
  onRemoveSource: (name: string) => void | Promise<void>
}) {
  const t = useTranslations()
  const { toast } = useToast()
  const [retryLoading, setRetryLoading] = useState<Record<string, boolean>>({})

  const totalSources = sources.length
  const storedOnServer = sources.filter((s: any) => !!s.__serverId).length
  const inMemoryOnly = totalSources - storedOnServer

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatLastUpdated = (dateString: string) => {
    const formattedDate = formatDate(dateString)
    return t('sources_manager.last_updated', { date: formattedDate })
  }

  
  
  

  if (sources.length === 0) {
    return (
      <Card className="p-12 text-center bg-card border-border">
        <FileJson className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold text-foreground mb-2">{t('sources_manager.empty.title')}</h3>
        <p className="text-muted-foreground">{t('sources_manager.empty.body')}</p>
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {(() => {
            const key = 'sources_manager.counts'
            const val = t(key)
            if (val !== key) return val
            return `${storedOnServer} armazenadas no servidor · ${inMemoryOnly} apenas na memória`
          })()}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sources.map((source, idx) => (
        <Card
          key={(source as any).id ?? (source as any).filename ?? `${source.name}-${idx}`}
          className="p-4 bg-card border-border hover:border-primary/50 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {source.type === "url" ? (
                  <Globe className="w-5 h-5 text-accent shrink-0" />
              ) : (
                  <FileJson className="w-5 h-5 text-primary shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground truncate">{source.name}</h3>
                  {(source.data || (source as any).__idbRef) && (
                      <span className="inline-block text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{t('sources_manager.offline_copy')}</span>
                    )}
                </div>
                {source.type === "url" && <p className="text-xs text-muted-foreground truncate">{source.url}</p>}
              </div>
            </div>
            <div className="flex gap-2">
                {source.type === 'url' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const key = source.url || source.name
                      setRetryLoading((s) => ({ ...s, [key]: true }))
                      try {
                        const controller = new AbortController()
                        const timeout = setTimeout(() => controller.abort(), 10000)
                        const res = await fetch(source.url, { signal: controller.signal })
                        clearTimeout(timeout)

                        if (!res.ok) {
                          const body = await res.text().catch(() => '')
                          log.warn('RETRY-NON-OK', { status: res.status, body })
                          throw new Error(`HTTP ${res.status}`)
                        }

                        // Obter texto e parsear defensivamente
                        const contentType = (res.headers.get('content-type') || '').toLowerCase()
                        const text = await res.text().catch(() => '')
                        let parsed: any = null

                        // Tenta parsear se o corpo aparenta ser JSON
                        if (contentType.includes('json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
                          try {
                            parsed = JSON.parse(text)
                          } catch (e) {
                            log.error('JSON-PARSE-ERROR', e)
                            toast({ title: t('sources_manager.retry.failed') || 'Falha ao carregar', description: t('sources_manager.retry_invalid_json') || 'Conteúdo inválido (não é JSON)' })
                            throw new Error('Falha ao parsear JSON')
                          }
                        } else {
                          log.error('RESPONSE-NOT-JSON', { sample: text.slice(0,200) })
                          toast({ title: t('sources_manager.retry.failed') || 'Falha ao carregar', description: t('sources_manager.retry_not_json') || 'Resposta não é JSON' })
                          throw new Error('Resposta não é JSON')
                        }

                        // Validação mínima da estrutura antes de enviar ao store
                        if (!parsed || typeof parsed.name !== 'string' || !Array.isArray(parsed.downloads)) {
                          log.error('INVALID-STRUCTURE', { parsed })
                          toast({ title: t('sources_manager.retry.failed') || 'Falha ao carregar', description: t('sources_manager.retry_invalid_json') || 'Conteúdo inválido' })
                          throw new Error('JSON inválido')
                        }

                        // Atualiza em memória via store (não persistimos estado de falha aqui)
                        const state = useDataState.getState() as any
                        if (typeof state.addGogData === 'function') {
                          await state.addGogData(parsed, source.url)
                          const successKey = 'sources_manager.retry.success'
                          const successLabel = t(successKey)
                          toast({ title: successLabel === successKey ? 'Carregado' : successLabel, description: source.name })
                        } else {
                          const failKey = 'sources_manager.retry.failed'
                          const failLabel = t(failKey)
                          toast({ title: failLabel === failKey ? 'Falha' : failLabel, description: 'Operação não disponível' })
                        }
                      } catch (e: any) {
                        log.error('RETRY-FAILED', e)
                          const failKey = 'sources_manager.retry.failed'
                          const failLabel = t(failKey)
                          toast({ title: failLabel === failKey ? 'Falha ao carregar' : failLabel, description: String(e) })
                      } finally {
                        const key = source.url || source.name
                        setRetryLoading((s) => ({ ...s, [key]: false }))
                      }
                    }}
                    className="shrink-0"
                  >
                    {retryLoading[source.url || source.name]
                      ? '...'
                      : (() => {
                          const key = 'sources_manager.retry_button'
                          const val = t(key)
                          return val === key ? 'Tentar novamente' : val
                        })()
                    }
                  </Button>
                )}
              {((source as any).__idbRef) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const state = useDataState.getState() as any
                    if (typeof state.loadSavedSourceByRef === "function") {
                      await state.loadSavedSourceByRef((source as any).__idbRef)
                    } else {
                      log.warn('LOAD-SAVED-SOURCE-UNAVAILABLE', null)
                    }
                  }}
                  className="shrink-0"
                >
                  Restaurar
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveSource(source.name)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
                <span>{formatLastUpdated(source.lastUpdated)}</span>
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`px-2 py-1 rounded font-medium ${source.type === "url" ? "bg-accent/20 text-accent" : "bg-muted/50 text-primary"}`}
              >
                  {t(source.type === "url" ? 'sources_manager.source_type.url' : 'sources_manager.source_type.file')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RotateCw className="w-3 h-3" />
                <span>{formatLastUpdated(source.lastUpdated)}</span>
            </div>
          </div>
        </Card>
      ))}
      </div>
    </div>
  )
}
