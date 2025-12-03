"use client"

import type React from "react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useTranslations } from "@/components/i18n-provider"
import { Input } from "@/components/ui/input"
import { Upload, Plus, LinkIcon, Loader } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { GogData } from '@/lib/types'

export default function FileUploadDialog({
  onFileUpload,
}: { onFileUpload: (data: GogData, sourceUrl?: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const dialogId = "file-upload-dialog"
  const tabsId = "file-upload-tabs"

  const MAX_FILE_SIZE = 200 * 1024 * 1024

  const t = useTranslations()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      setError(
        t('upload.file.error.too_large').replace('{size}', (file.size / (1024 * 1024)).toFixed(2))
      )
      return
    }

    setLoading(true)
    setError(null)

    const reader = new FileReader()
    reader.onload = (e) => {
        try {
        const json = JSON.parse(e.target?.result as string) as GogData
        if (json.name && json.downloads && Array.isArray(json.downloads)) {
          const sourceData = {
            ...json,
            downloads: json.downloads.map((dl) => ({
              ...dl,
              source: json.name,
            })),
          }
          onFileUpload(sourceData)
          setOpen(false)
          setLoading(false)
        } else {
          setError(t('upload.file.error.invalid_format'))
          setLoading(false)
        }
      } catch (error) {
        setError(t('upload.file.error.read_error'))
        setLoading(false)
      }
    }
    reader.readAsText(file)
  }

  const handleUrlLoad = async () => {
    if (!urlInput.trim()) {
      setError(t('upload.url.error.invalid_url'))
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(urlInput.trim())
      if (!response.ok) {
        throw new Error(t('upload.url.error.http_error').replace('{status}', response.status.toString()))
      }
      const json = (await response.json()) as GogData

      if (json.name && json.downloads && Array.isArray(json.downloads)) {
        const sourceData = {
          ...json,
          downloads: json.downloads.map((dl) => ({
            ...dl,
            source: `${json.name} (URL)`,
          })),
        }
        onFileUpload(sourceData, urlInput.trim())
        setUrlInput("")
        setOpen(false)
      } else {
        setError(t('upload.url.error.invalid_format'))
      }
    } catch (error) {
      setError(t('upload.url.error.load_error').replace('{message}', error instanceof Error ? error.message : t('upload.url.error.unknown')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild data-dialog-id={dialogId}>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Plus className="w-4 h-4" />
          {t('buttons.load_json')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-dialog-id={dialogId}>
        <DialogHeader>
          <DialogTitle>{t('upload.dialog.title')}</DialogTitle>
          <DialogDescription>{t('upload.dialog.description')}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="file" className="w-full" data-tabs-id={tabsId}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file" data-tabs-id={tabsId}>{t('upload.dialog.tabs.file')}</TabsTrigger>
            <TabsTrigger value="url">{t('upload.dialog.tabs.url')}</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="mt-4">
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                disabled={loading}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center gap-2"
                disabled={loading}
              >
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {loading ? t('upload.file.loading') : t('upload.file.drag_drop')}
                </span>
                <span className="text-xs text-muted-foreground">{t('upload.file.max_size')}</span>
              </button>
            </div>
          </TabsContent>

          <TabsContent value="url" className="mt-4">
            <div className="flex flex-col gap-3">
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('upload.url.placeholder')}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={loading}
                  className="pl-10"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) {
                      handleUrlLoad()
                    }
                  }}
                />
              </div>
              <Button onClick={handleUrlLoad} disabled={loading} className="w-full gap-2">
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    {t('upload.file.loading')}
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4" />
                    {t('upload.url.button')}
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t('upload.url.help')}
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded mt-4">{error}</div>}
      </DialogContent>
    </Dialog>
  )
}
