"use client"

import type React from "react"

import { useRef } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload } from "lucide-react"

import type { GogData } from '@/lib/types'

export default function FileUploader({ onFileUpload }: { onFileUpload: (data: GogData) => void }) {
  const t = useTranslations()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string) as GogData
        if (json.name && json.downloads && Array.isArray(json.downloads)) {
          onFileUpload(json)
        } else {
          alert(t("upload.file.error.invalid_format"))
        }
      } catch (error) {
        alert(t("upload.file.error.read_error"))
      }
    }
    reader.readAsText(file)
  }

  return (
    <Card className="border-2 border-dashed border-border bg-card/50 p-12">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-1">{t("upload.uploader.title")}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t("upload.uploader.description")}
          </p>
        </div>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
        <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
          <Upload className="w-4 h-4" />
          {t("upload.uploader.button")}
        </Button>
      </div>
    </Card>
  )
}
