"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Upload, Trash2, Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import JsonUploader from "@/components/json-uploader"
import SearchResults from "@/components/search-results"
import ThemeSelector from "@/components/theme-selector"
import { saveFiles, loadFiles } from "@/lib/storage"

interface JsonFile {
  id: string
  name: string
  data: any
  sourceUrl?: string // URL de origem se carregado por URL
}

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [jsonFiles, setJsonFiles] = useState<JsonFile[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Carregar dados do IndexedDB
  useEffect(() => {
    setMounted(true)
    loadFiles()
      .then((files) => {
        setJsonFiles(files)
      })
      .catch((err) => {
        console.error("Erro ao carregar arquivos:", err)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  // Salvar dados no IndexedDB sempre que mudar
  useEffect(() => {
    if (mounted && jsonFiles.length > 0) {
      saveFiles(jsonFiles).catch((err) => {
        console.error("Erro ao salvar arquivos:", err)
      })
    }
  }, [jsonFiles, mounted])

  const handleJsonLoaded = (name: string, data: any, sourceUrl?: string) => {
    const newFile: JsonFile = {
      id: Date.now().toString(),
      name,
      data,
      sourceUrl,
    }
    setJsonFiles((prev) => [...prev, newFile])
  }

  const performSearch = (query: string) => {
    if (!query.trim()) {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const searchTerm = query.toLowerCase()
    const allResults: any[] = []

    jsonFiles.forEach((file) => {
      const fileResults = searchInJson(file.data, searchTerm, file.name)
      allResults.push(...fileResults)
      
      // Limitar a 100 resultados total para performance
      if (allResults.length >= 100) {
        allResults.length = 100
      }
    })

    setResults(allResults)
    setIsSearching(false)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)

    // Limpar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Debounce de 300ms
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query)
    }, 300)
  }

  const searchInJson = (obj: any, term: string, fileName: string): any[] => {
    const results: any[] = []
    const visited = new Set<any>()

    const recursiveSearch = (current: any, depth: number = 0): void => {
      // Limitar profundidade para evitar loops
      if (depth > 20) return

      // Evitar referências circulares
      if (typeof current === "object" && current !== null) {
        if (visited.has(current)) return
        visited.add(current)
      }

      if (Array.isArray(current)) {
        for (let i = 0; i < current.length; i++) {
          const item = current[i]
          
          // Se é um objeto com title e uris, trata como um resultado potencial
          if (item && typeof item === "object" && (item.title || item.name)) {
            const stringified = JSON.stringify(item).toLowerCase()
            if (stringified.includes(term)) {
              results.push({
                fileName,
                title: item.title || item.name || "Unnamed",
                fileSize: item.fileSize || item.size || "N/A",
                uploadDate: item.uploadDate || item.date || "Unknown",
                uris: item.uris || item.links || item.magnet || [],
                fullItem: item,
              })
              
              // Parar se atingir limite
              if (results.length >= 100) return
            }
          } else {
            recursiveSearch(item, depth + 1)
          }
          
          if (results.length >= 100) break
        }
      } else if (current !== null && typeof current === "object") {
        const values = Object.values(current)
        for (const value of values) {
          recursiveSearch(value, depth + 1)
          if (results.length >= 100) break
        }
      }
    }

    recursiveSearch(obj)
    return results
  }

  const removeFile = (id: string) => {
    setJsonFiles((prev) => prev.filter((f) => f.id !== id))
    setResults([])
  }

  const refreshFile = async (file: JsonFile) => {
    if (!file.sourceUrl) return

    try {
      const response = await fetch(file.sourceUrl)
      if (!response.ok) throw new Error("Erro ao atualizar")

      const newData = await response.json()
      setJsonFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, data: newData } : f
        )
      )
      setResults([])
    } catch (err) {
      console.error("Erro ao atualizar arquivo:", err)
    }
  }

  const downloadResults = () => {
    const dataStr = JSON.stringify(results, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `search-results-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!mounted) return null

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      <ThemeSelector />

      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: `var(--bg-primary)cc` }}>
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin">
              <Search 
                className="w-8 h-8" 
                style={{ color: "var(--primary)" }} 
              />
            </div>
            <p style={{ color: "var(--text-secondary)" }}>Carregando arquivos...</p>
          </div>
        </div>
      )}

      {/* Header with animation */}
      <div
        className="border-b transition-colors duration-300"
        style={{ borderColor: "var(--border-color)", backgroundColor: `var(--bg-secondary)` }}
      >
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4 animate-fadeIn-up">
            <div
              className="w-10 h-10 rounded-lg bg-gradient-to-br transition-all duration-300"
              style={{
                backgroundImage: `linear-gradient(135deg, var(--primary), var(--accent))`,
              }}
            >
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1
                className="text-3xl font-bold transition-colors duration-300"
                style={{ color: "var(--text-primary)" }}
              >
                JSON Search Engine
              </h1>
              <p className="text-sm transition-colors duration-300" style={{ color: "var(--text-secondary)" }}>
                Busque termos em arquivos JSON e encontre links magnéticos
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Upload & Files */}
          <div className="lg:col-span-1">
            <div className="space-y-6 sticky top-24">
              {/* Upload Section */}
              <Card
                className="bg-slate-800 border-slate-700 transition-all duration-300 card-hover"
                style={{
                  backgroundColor: `var(--bg-secondary)`,
                  borderColor: `var(--border-color)`,
                }}
              >
                <div className="p-6">
                  <h2
                    className="text-lg font-semibold mb-4 flex items-center gap-2 transition-colors duration-300"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <Plus className="w-5 h-5" style={{ color: "var(--primary)" }} />
                    Adicionar JSON
                  </h2>
                  <JsonUploader onJsonLoaded={handleJsonLoaded} />
                </div>
              </Card>

              {/* Files List */}
              {jsonFiles.length > 0 && (
                <Card
                  className="bg-slate-800 border-slate-700 transition-all duration-300 card-hover animate-slide-in-left"
                  style={{
                    backgroundColor: `var(--bg-secondary)`,
                    borderColor: `var(--border-color)`,
                  }}
                >
                  <div className="p-6">
                    <h3
                      className="text-sm font-semibold mb-3 uppercase tracking-wide transition-colors duration-300"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Arquivos Carregados ({jsonFiles.length})
                    </h3>
                    <div className="space-y-2">
                      {jsonFiles.map((file, index) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between rounded-lg p-3 group transition-all duration-300 animate-fadeIn-up"
                          style={{
                            backgroundColor: `var(--bg-tertiary)`,
                            animationDelay: `${index * 0.1}s`,
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm truncate transition-colors duration-300"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {file.name}
                            </p>
                            <p
                              className="text-xs transition-colors duration-300"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {file.sourceUrl ? "URL" : "Arquivo"} • JSON
                            </p>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                            {file.sourceUrl && (
                              <button
                                onClick={() => refreshFile(file)}
                                className="p-1 hover:scale-110 transition-transform duration-200"
                                title="Atualizar conteúdo da URL"
                              >
                                <RefreshCw
                                  className="w-4 h-4"
                                  style={{ color: "var(--primary)" }}
                                />
                              </button>
                            )}
                            <button
                              onClick={() => removeFile(file.id)}
                              className="p-1 hover:scale-110 transition-transform duration-200"
                            >
                              <Trash2
                                className="w-4 h-4"
                                style={{ color: "var(--accent)" }}
                              />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Right Content - Search & Results */}
          <div className="lg:col-span-2">
            {/* Search Bar */}
            <Card
              className="bg-slate-800 border-slate-700 mb-8 transition-all duration-300 card-hover animate-slide-in-right"
              style={{
                backgroundColor: `var(--bg-secondary)`,
                borderColor: `var(--border-color)`,
              }}
            >
              <div className="p-6">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-3 w-5 h-5 transition-colors duration-300"
                    style={{ color: "var(--text-secondary)" }}
                  />
                  <Input
                    placeholder="Digite um termo para buscar..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 h-12 transition-all duration-300 border"
                    style={{
                      backgroundColor: `var(--bg-tertiary)`,
                      borderColor: `var(--border-color)`,
                      color: `var(--text-primary)`,
                    }}
                  />
                </div>
              </div>
            </Card>

            {/* Results */}
            <div className="space-y-6">
              {isSearching && (
                <div className="flex items-center justify-center py-8 animate-fadeIn-up">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin">
                      <Search 
                        className="w-6 h-6" 
                        style={{ color: "var(--primary)" }} 
                      />
                    </div>
                    <p 
                      className="text-sm transition-colors duration-300" 
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Buscando...
                    </p>
                  </div>
                </div>
              )}

              {results.length > 0 && (
                <div className="flex items-center justify-between animate-fadeIn-up">
                  <div>
                    <p className="transition-colors duration-300" style={{ color: "var(--text-secondary)" }}>
                      <span
                        className="font-semibold transition-colors duration-300"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {results.length}
                      </span>{" "}
                      resultado
                      {results.length !== 1 ? "s" : ""} encontrado{results.length !== 1 ? "s" : ""}
                      {results.length >= 100 && (
                        <span style={{ color: "var(--accent)" }}> (limitado a 100)</span>
                      )}
                    </p>
                  </div>
                  <Button
                    onClick={downloadResults}
                    className="text-white transition-all duration-300 hover:scale-105"
                    style={{
                      backgroundColor: `var(--primary)`,
                      borderColor: `var(--accent)`,
                    }}
                  >
                    Download JSON
                  </Button>
                </div>
              )}

              {jsonFiles.length === 0 ? (
                <Card
                  className="bg-slate-800 border-slate-700 border-dashed transition-all duration-300 card-hover animate-fadeIn-up"
                  style={{
                    backgroundColor: `var(--bg-secondary)`,
                    borderColor: `var(--border-color)`,
                  }}
                >
                  <div className="p-12 text-center">
                    <Upload
                      className="w-12 h-12 mx-auto mb-4 transition-colors duration-300"
                      style={{ color: "var(--text-secondary)" }}
                    />
                    <h3
                      className="text-lg font-semibold mb-2 transition-colors duration-300"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Nenhum arquivo carregado
                    </h3>
                    <p className="transition-colors duration-300" style={{ color: "var(--text-secondary)" }}>
                      Comece adicionando um arquivo JSON para buscar
                    </p>
                  </div>
                </Card>
              ) : results.length > 0 ? (
                <SearchResults results={results} />
              ) : searchQuery ? (
                <Card
                  className="bg-slate-800 border-slate-700 transition-all duration-300 card-hover animate-fadeIn-up"
                  style={{
                    backgroundColor: `var(--bg-secondary)`,
                    borderColor: `var(--border-color)`,
                  }}
                >
                  <div className="p-12 text-center">
                    <Search
                      className="w-12 h-12 mx-auto mb-4 transition-colors duration-300"
                      style={{ color: "var(--text-secondary)" }}
                    />
                    <h3
                      className="text-lg font-semibold transition-colors duration-300"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Nenhum resultado encontrado
                    </h3>
                    <p className="transition-colors duration-300" style={{ color: "var(--text-secondary)" }}>
                      Tente outro termo de busca
                    </p>
                  </div>
                </Card>
              ) : (
                <Card
                  className="bg-slate-800 border-slate-700 transition-all duration-300 card-hover animate-fadeIn-up"
                  style={{
                    backgroundColor: `var(--bg-secondary)`,
                    borderColor: `var(--border-color)`,
                  }}
                >
                  <div className="p-12 text-center">
                    <Search
                      className="w-12 h-12 mx-auto mb-4 transition-colors duration-300"
                      style={{ color: "var(--text-secondary)" }}
                    />
                    <h3
                      className="text-lg font-semibold transition-colors duration-300"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Digite para começar
                    </h3>
                    <p className="transition-colors duration-300" style={{ color: "var(--text-secondary)" }}>
                      Busque por títulos, nomes ou outros termos
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
