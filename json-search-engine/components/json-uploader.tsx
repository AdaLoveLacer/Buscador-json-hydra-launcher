"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, Link2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface JsonUploaderProps {
  onJsonLoaded: (name: string, data: any, sourceUrl?: string) => void
}

export default function JsonUploader({ onJsonLoaded }: JsonUploaderProps) {
  const [urlInput, setUrlInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".json")) {
      setError("Por favor, selecione um arquivo JSON válido")
      return
    }

    setError("")
    setLoading(true)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        onJsonLoaded(file.name, json)
        setLoading(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      } catch (err) {
        setError("Arquivo JSON inválido")
        setLoading(false)
      }
    }
    reader.readAsText(file)
  }

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!urlInput.trim()) return

    setError("")
    setLoading(true)

    try {
      const response = await fetch(urlInput)
      if (!response.ok) throw new Error("Erro ao carregar URL")

      const json = await response.json()
      const fileName = new URL(urlInput).pathname.split("/").pop() || "arquivo.json"
      onJsonLoaded(fileName, json, urlInput) // Passa a URL como sourceUrl
      setUrlInput("")
    } catch (err) {
      setError("Erro ao carregar JSON da URL. Verifique se a URL é válida.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* File Upload */}
      <div>
        <label className="block">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            disabled={loading}
            className="hidden"
          />
          <div
            className="border-2 border-dashed rounded-lg p-6 hover:bg-opacity-50 transition-all cursor-pointer text-center animate-float"
            style={{
              borderColor: `var(--border-color)`,
              backgroundColor: `var(--bg-tertiary)40`,
            }}
          >
            <Upload
              className="w-6 h-6 mx-auto mb-2 transition-colors duration-300"
              style={{ color: "var(--text-secondary)" }}
            />
            <p className="text-sm font-medium transition-colors duration-300" style={{ color: "var(--text-primary)" }}>
              Clique ou arraste um arquivo
            </p>
            <p className="text-xs transition-colors duration-300" style={{ color: "var(--text-secondary)" }}>
              JSON apenas
            </p>
          </div>
        </label>
      </div>

      {/* OR Divider */}
      <div className="relative flex items-center gap-3">
        <div
          className="flex-1 h-px transition-colors duration-300"
          style={{ backgroundColor: `var(--border-color)` }}
        ></div>
        <span className="text-xs font-medium transition-colors duration-300" style={{ color: "var(--text-secondary)" }}>
          OU
        </span>
        <div
          className="flex-1 h-px transition-colors duration-300"
          style={{ backgroundColor: `var(--border-color)` }}
        ></div>
      </div>

      {/* URL Input */}
      <form onSubmit={handleUrlSubmit} className="space-y-3">
        <div className="relative">
          <Link2
            className="absolute left-3 top-3 w-4 h-4 transition-colors duration-300"
            style={{ color: "var(--text-secondary)" }}
          />
          <Input
            type="url"
            placeholder="Cole a URL do JSON"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            disabled={loading}
            className="pl-9 transition-all duration-300 border"
            style={{
              backgroundColor: `var(--bg-tertiary)`,
              borderColor: `var(--border-color)`,
              color: `var(--text-primary)`,
            }}
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !urlInput.trim()}
          className="w-full text-white transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            backgroundColor: `var(--primary)`,
            borderColor: `var(--accent)`,
          }}
        >
          {loading ? "Carregando..." : "Carregar JSON"}
        </Button>
      </form>

      {/* Error Message */}
      {error && (
        <div
          className="flex items-start gap-3 rounded-lg p-3 border transition-all duration-300 animate-fadeIn-up"
          style={{
            backgroundColor: `var(--accent)20`,
            borderColor: `var(--accent)`,
          }}
        >
          <AlertCircle
            className="w-5 h-5 flex-shrink-0 mt-0.5 transition-colors duration-300"
            style={{ color: "var(--accent)" }}
          />
          <p className="text-sm transition-colors duration-300" style={{ color: "var(--accent)" }}>
            {error}
          </p>
        </div>
      )}
    </div>
  )
}
