"use client"

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { GogData, GogSourcesStoreItemWithData } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import { normalizeText } from '@/lib/utils'
import { API_BASE } from '@/lib/config'
import { createLogger } from '@/lib/logger'

const log = createLogger('storage')

// Constantes
const MAX_GOG_SOURCES = 50
const MAX_DOWNLOADS_PER_SOURCE = 200
const uploadInProgress: Set<string> = new Set() // Controle de operações concorrentes

// Funções auxiliares
const parseFileSize = (sizeStr?: string): number => {
  if (!sizeStr || sizeStr === "N/A") return 0
  const match = String(sizeStr).match(/[\d.]+/)
  if (!match) return 0
  const num = Number.parseFloat(match[0])
  if (String(sizeStr).includes("GB")) return Math.round(num * 1024 * 1024 * 1024)
  if (String(sizeStr).includes("MB")) return Math.round(num * 1024 * 1024)
  if (String(sizeStr).includes("KB")) return Math.round(num * 1024)
  return Math.round(num)
}

  // Sanitize strings received from remote URLs to remove invisible/control
  // characters and normalize common punctuation before generating normalized tokens.
  function sanitizeForNormalization(s?: string): string {
    if (!s) return ''
    try {
      let out = String(s)
      // remove BOM
      out = out.replace(/\uFEFF/g, '')
      // remove zero-width and bidi/control characters
      out = out.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g, '')
      // remove other C0/C1 control chars
      out = out.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
      // normalize various dashes to simple space
      out = out.replace(/[\u2010-\u2015\u2012\u2013\u2014\u2212]/g, ' ')
      // replace multiple whitespace with single space
      out = out.replace(/\s+/g, ' ')
      return out.trim()
    } catch (e) {
      return String(s).trim()
    }
  }

// Centraliza e padroniza normalização dos campos
const normalizeGogData = (src: GogData): GogData => ({
  ...src,
  downloads: Array.isArray(src.downloads)
    ? src.downloads.slice(0, MAX_DOWNLOADS_PER_SOURCE).map((dl) => ({
        ...(dl as any),
        fileSizeBytes: parseFileSize((dl as any).fileSize),
        titleNormalized: normalizeText((dl as any).title),
        sourceNormalized: normalizeText((dl as any).source ?? src.name),
        urisNormalized: normalizeText(Array.isArray((dl as any).uris) ? (dl as any).uris.join(' ') : ''),
        // ingestion source marker (debug): will be set to 'url' or 'file' by addGogData
        __ingestionSource: undefined as unknown as 'url' | 'file' | undefined,
      }))
    : []
})

export interface DataState {
  gogData: GogData[]
  savedSources: GogSourcesStoreItemWithData[]
  addGogData: (data: GogData, sourceUrl?: string) => void
  removeSource: (sourceName: string) => Promise<void>
  loadSavedSource: (id: string) => Promise<void>
}

async function uploadToServer(data: GogData): Promise<string> {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const formData = new FormData()
  formData.append('file', blob, `${data.name}.json`)
  formData.append('name', data.name)

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    throw new Error('Falha ao fazer upload')
  }

  const result = await response.json()
  return result.id
}

async function downloadFromServer(id: string): Promise<GogData> {
  const response = await fetch(`${API_BASE}/json/${id}`)
  if (!response.ok) {
    // tenta ler corpo para ter mais contexto no log
    const body = await response.text().catch(() => '')
    log.warn('DOWNLOAD-FAILED', { status: response.status, body })
    throw new Error('Falha ao baixar dados')
  }

  // Protege contra respostas HTML (ex: página de erro) que causariam
  // `Unexpected token '<'` ao chamar response.json()
  const text = await response.text()
  try {
    return JSON.parse(text) as GogData
  } catch (e) {
    log.error('JSON-PARSE-FAILED', { id, message: e instanceof Error ? e.message : String(e) })
    throw new Error('Resposta inválida do servidor (não é JSON)')
  }
}

async function deleteFromServer(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/delete/${id}`, {
    method: 'DELETE'
  })
  if (!response.ok) {
    throw new Error('Falha ao deletar')
  }
}

export const useDataState = create<DataState>()(
  persist(
    (set, get) => ({
      gogData: [],
      savedSources: [],

      addGogData: (data: GogData, sourceUrl?: string) => {
        if (uploadInProgress.has(data.name)) {
          toast({
            title: 'Operação em andamento',
            description: 'Aguarde a conclusão do upload anterior.',
            variant: 'destructive'
          })
          return
        }
        uploadInProgress.add(data.name)

        set((state) => {
          const prunedData = normalizeGogData(data)

          // Tag each download with its ingestion source for debugging/diagnostics.
          // This does not affect core behavior but helps identify differences
          // between URL-sourced and file-uploaded data in the UI/debug console.
            // If this source came from a URL, perform conservative sanitization
            // and recompute normalized tokens to reduce inconsistencies caused
            // by invisible characters or odd punctuation in remote JSON.
            try {
              if (sourceUrl && Array.isArray(prunedData.downloads)) {
                prunedData.downloads = prunedData.downloads.map((dl) => {
                  try {
                    const rawTitle = (dl as any).title || ''
                    const cleanedTitle = sanitizeForNormalization(rawTitle)
                    const rawUris = Array.isArray((dl as any).uris) ? (dl as any).uris.join(' ') : ((dl as any).uris || '')
                    const cleanedUris = sanitizeForNormalization(rawUris)

                    return {
                      ...(dl as any),
                      titleNormalized: normalizeText(cleanedTitle),
                      urisNormalized: normalizeText(cleanedUris),
                    }
                  } catch (e) {
                    return dl
                  }
                })
              }
            } catch (e) {
              log.debug('SANITIZE-FAILED', { error: e instanceof Error ? e.message : String(e) })
            }
          try {
            const sourceTag = sourceUrl ? 'url' : 'file'
            if (Array.isArray(prunedData.downloads)) {
              prunedData.downloads = prunedData.downloads.map((dl) => ({ ...(dl as any), __ingestionSource: sourceTag }))
            }
          } catch (e) {
            log.debug('TAG-SOURCE-FAILED', { error: e instanceof Error ? e.message : String(e) })
          }

          let newGogData = [
            ...state.gogData.filter((g) => g.name !== prunedData.name),
            prunedData
          ]

          if (newGogData.length > MAX_GOG_SOURCES) {
            newGogData = newGogData.slice(-MAX_GOG_SOURCES)
          }

          const newSaved = [...state.savedSources]
          const meta: GogSourcesStoreItemWithData = {
            name: prunedData.name,
            url: sourceUrl || '',
            type: sourceUrl ? 'url' : 'file',
            lastUpdated: new Date().toISOString()
          }

          // When sourceUrl is provided prefer strict URL matching to avoid
          // accidental overwrites when a file and a URL share the same name.
          const idx = sourceUrl
            ? newSaved.findIndex((s) => s.url === sourceUrl)
            : newSaved.findIndex((s) => s.name === prunedData.name && s.type === 'file')

          if (idx === -1) newSaved.push(meta)
          else newSaved[idx] = meta

          // Upload pruned/sanitized data to server only for local file uploads. Skip for URL sources
          if (!sourceUrl) {
            uploadToServer(prunedData)
              .then((id) => {
                set((s) => ({
                  savedSources: s.savedSources.map((ss) =>
                    (ss.url && sourceUrl && ss.url === sourceUrl) || ss.name === prunedData.name
                      ? { ...ss, __serverId: id }
                      : ss
                  )
                }))
              })
              .catch((e) => log.error('UPLOAD-FAILED', e))
              .finally(() => uploadInProgress.delete(data.name))
          } else {
            // URL sources are not uploaded to server to avoid duplicating large blobs
            log.debug('SKIP-URL-UPLOAD', { sourceUrl })
            try {
              toast({ title: 'Mantido localmente', description: 'Fonte baseada em URL não enviada ao servidor.' })
            } catch (e) {
              log.debug('TOAST-FAILED', e)
            }
            uploadInProgress.delete(data.name)
          }

          return { gogData: newGogData, savedSources: newSaved }
        })
      },

      removeSource: async (sourceName: string) => {
        const state = get()
        const toDelete = state.savedSources.find(s => s.name === sourceName)
        
        // Atualiza o estado local primeiro
        set((st) => ({
          gogData: st.gogData.filter((g) => g.name !== sourceName),
          savedSources: st.savedSources.filter((s) => s.name !== sourceName)
        }))

        // Tenta remover do servidor se tiver ID
        if (toDelete && '__serverId' in toDelete && typeof toDelete.__serverId === 'string') {
          try {
            await deleteFromServer(toDelete.__serverId)
            toast({
              title: 'Fonte removida',
              description: `${sourceName} foi removido com sucesso do servidor.`
            })
          } catch (e) {
            log.warn('DELETE-SERVER-FAILED', e)
            toast({
              title: 'Atenção',
              description: 'A fonte foi removida localmente, mas houve um erro ao remover do servidor.',
              variant: 'destructive'
            })
          }
        } else {
          toast({
            title: 'Fonte removida',
            description: `${sourceName} foi removido localmente.`
          })
        }
      },

      loadSavedSource: async (id: string) => {
        try {
          const data = await downloadFromServer(id)
          let pruned = normalizeGogData(data)
          try {
            // When rehydrating from server this is likely a file-sourced item
            if (Array.isArray(pruned.downloads)) {
              pruned.downloads = pruned.downloads.map((dl) => ({ ...(dl as any), __ingestionSource: 'file' }))
            }
          } catch (e) { /* ignore */ }

          set((st) => {
            let newGogData = [...st.gogData.filter((g) => g.name !== pruned.name), pruned]
            if (newGogData.length > MAX_GOG_SOURCES) newGogData = newGogData.slice(-MAX_GOG_SOURCES)
            return { gogData: newGogData }
          })

          toast({
            title: 'Fonte carregada',
            description: `${pruned.name} foi carregado com sucesso.`
          })
        } catch (e) {
          log.error('LOAD-SERVER-SOURCE-FAILED', e)
          toast({
            title: 'Erro ao carregar fonte',
            description: 'Não foi possível carregar os dados do servidor.',
            variant: 'destructive'
          })
        }
      }
    }),
    {
      name: 'gog-data-storage',
      partialize: (s) => ({ savedSources: s.savedSources }),
      storage: createJSONStorage(() => localStorage)
    }
  )
)