"use client"

import React, { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Calendar, HardDrive, LinkIcon, ExternalLink, Globe, FileJson } from "lucide-react"
import { useTranslations } from "@/components/i18n-provider"

interface DownloadItem {
  fileSize: string
  uploadDate: string
  uris: string[]
  title: string
  source?: string
}

function DownloadCardComponent({ download }: { download: DownloadItem }) {
  const t = useTranslations()
  const [copied, setCopied] = useState(false)
  const [showLinks, setShowLinks] = useState(false)

  const isUrlSource = !!download.source && download.source.includes("(URL)")
  const sourceDisplay = (download.source ?? t('download_card.unknown_source')).replace(" (URL)", "")

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (dateString: string) => {
    // document.documentElement.lang can be an empty string (which is a valid property
    // but invalid as a BCP-47 locale for toLocaleDateString). Use a robust fallback
    // chain: document language -> navigator.language -> default 'pt-BR'.
    const locale = document.documentElement.lang || navigator.language || 'pt-BR'
    return new Date(dateString).toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  return (
    <Card className="overflow-hidden border-border bg-card hover:bg-card/80 transition-colors group">
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-foreground mb-3 line-clamp-2 text-sm group-hover:text-primary transition">
          {download.title}
        </h3>

        {/* Metadata */}
        <div className="space-y-2 mb-4 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(download.uploadDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <HardDrive className="w-4 h-4" />
            <span className="font-medium">{download.fileSize}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            {isUrlSource ? (
              <Globe className="w-4 h-4 text-accent" />
            ) : (
              <FileJson className="w-4 h-4 text-muted-foreground" />
            )}
            <span
              className={`text-xs px-2 py-1 rounded font-medium ${isUrlSource ? "bg-accent/20 text-accent" : "bg-muted/50 text-primary"}`}
            >
              {sourceDisplay} {isUrlSource && t('download_card.url_suffix')}
            </span>
          </div>
        </div>

        {/* Links Preview */}
        {download.uris.length > 0 && (
          <div className="mb-4 p-3 bg-muted/50 rounded-md">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground mb-2">
              <LinkIcon className="w-4 h-4" />
              {download.uris.length} {download.uris.length === 1 ? t('download_card.links.count_singular') : t('download_card.links.count_plural')}
            </div>
            <a
              href={download.uris[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:text-primary/80 line-clamp-2 break-all flex items-start gap-1 group/link"
            >
              <ExternalLink className="w-3 h-3 shrink-0 mt-0.5" />
              <span className="hover:underline">{download.uris[0]}</span>
            </a>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(download.uris[0] || "")}
            disabled={!download.uris[0]}
            className="flex-1 gap-1 text-xs"
          >
            <Copy className="w-3 h-3" />
            {copied ? t('download_card.links.copied') : t('download_card.links.copy')}
          </Button>
          {download.uris.length > 1 && (
            <Button variant="ghost" size="sm" onClick={() => setShowLinks(!showLinks)} className="text-xs">
              {download.uris.length - 1}+
            </Button>
          )}
        </div>

        {/* Additional Links */}
        {showLinks && download.uris.length > 1 && (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            {download.uris.slice(1).map((uri, idx) => (
              <a
                key={idx}
                href={uri}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-left text-xs p-2 bg-muted/30 rounded hover:bg-muted/50 transition truncate text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                {t('download_card.links.link_number').replace('{number}', (idx + 2).toString())}
              </a>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

// Memoize to avoid unnecessary rerenders when props don't change
export default React.memo(DownloadCardComponent)
