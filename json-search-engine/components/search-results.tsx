"use client"

import { useState } from "react"
import { Copy, Check, LinkIcon, Download } from "lucide-react"
import { Card } from "@/components/ui/card"

interface SearchResultsProps {
  results: any[]
}

export default function SearchResults({ results }: SearchResultsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const openMagnetLink = (uri: string) => {
    // Abre o link magnético no cliente de torrent padrão
    if (uri.startsWith("magnet:")) {
      window.location.href = uri
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("pt-BR")
    } catch {
      return dateString
    }
  }

  return (
    <div className="space-y-4">
      {results.map((result, index) => (
        <Card
          key={`${result.fileName}-${index}`}
          className="border overflow-hidden transition-all duration-300 card-hover animate-fadeIn-up"
          style={{
            backgroundColor: `var(--bg-secondary)`,
            borderColor: `var(--border-color)`,
            animationDelay: `${index * 0.1}s`,
          }}
        >
          <div className="p-6">
            {/* Header */}
            <div className="mb-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3
                    className="text-lg font-semibold mb-1 line-clamp-2 transition-colors duration-300"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {result.title}
                  </h3>
                  <p className="text-xs transition-colors duration-300" style={{ color: "var(--text-secondary)" }}>
                    Arquivo:{" "}
                    <span className="transition-colors duration-300" style={{ color: "var(--text-primary)" }}>
                      {result.fileName}
                    </span>
                  </p>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-4 text-sm">
                {result.fileSize && (
                  <div className="flex items-center gap-1">
                    <span className="transition-colors duration-300" style={{ color: "var(--text-secondary)" }}>
                      Tamanho:
                    </span>
                    <span
                      className="font-medium transition-colors duration-300"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {result.fileSize}
                    </span>
                  </div>
                )}
                {result.uploadDate && (
                  <div className="flex items-center gap-1">
                    <span className="transition-colors duration-300" style={{ color: "var(--text-secondary)" }}>
                      Data:
                    </span>
                    <span
                      className="font-medium transition-colors duration-300"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {formatDate(result.uploadDate)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Links */}
            {result.uris && result.uris.length > 0 && (
              <div className="space-y-2">
                <p
                  className="text-sm font-medium mb-3 transition-colors duration-300"
                  style={{ color: "var(--text-primary)" }}
                >
                  🔗 Links Magnéticos ({result.uris.length}):
                </p>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {result.uris.map((uri: string, uriIndex: number) => (
                    <div
                      key={uriIndex}
                      className="flex items-start gap-2 rounded-lg p-3 group transition-all duration-300 hover:bg-opacity-60"
                      style={{
                        backgroundColor: `var(--bg-tertiary)60`,
                        border: `1px solid var(--border-color)`,
                      }}
                    >
                      <LinkIcon
                        className="w-4 h-4 flex-shrink-0 mt-1 transition-colors duration-300"
                        style={{ color: "var(--primary)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs break-all font-mono group-hover:line-clamp-none transition-all duration-300 cursor-pointer"
                          style={{ color: "var(--text-secondary)" }}
                          title={uri}
                        >
                          {uri.substring(0, 80)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-all duration-200 flex-shrink-0 ml-2">
                        {uri.startsWith("magnet:") && (
                          <button
                            onClick={() => openMagnetLink(uri)}
                            className="p-1 hover:scale-110 transition-transform duration-200"
                            title="Abrir com cliente torrent"
                          >
                            <Download
                              className="w-4 h-4"
                              style={{ color: "var(--primary)" }}
                            />
                          </button>
                        )}
                        <button
                          onClick={() => copyToClipboard(uri, `${index}-${uriIndex}`)}
                          className="p-1 hover:scale-110 transition-transform duration-200"
                          title="Copiar link"
                        >
                          {copiedId === `${index}-${uriIndex}` ? (
                            <Check className="w-4 h-4 animate-pulse" style={{ color: "var(--primary)" }} />
                          ) : (
                            <Copy
                              className="w-4 h-4"
                              style={{ color: "var(--accent)" }}
                            />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(!result.uris || result.uris.length === 0) && (
              <div className="p-3 rounded-lg text-xs transition-colors duration-300" style={{ backgroundColor: `var(--bg-tertiary)30`, color: "var(--text-secondary)" }}>
                ℹ️ Nenhum link magnético encontrado neste item
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}
