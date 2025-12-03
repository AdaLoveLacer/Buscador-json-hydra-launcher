import type { DownloadType, GogData, GogSourcesStoreItemWithData } from "./types"
import { getCachedUrl, cacheUrlData } from "./url-cache"
import { API_BASE } from "./config"
import { createLogger } from "./logger"
import { LRUCache } from "./lru-cache"
import { normalizeText } from "./utils"

const log = createLogger('search')

// Callbacks interface for loader
export interface LoaderCallbacks {
  onLoadStart?: () => void
  onLoadEnd?: () => void
  onAddData: (data: GogData, url?: string) => void
  onError?: (error: Error) => void
}

// URL control constants
export const processedUrlLoads = new Set<string>()
export const recentlyRemovedUrls = new Set<string>()
export const failedUrlAt: Record<string, number> = {}
export const FAILED_URL_RETRY_MS = 10 * 60 * 1000 // 10 minutes

// Type guard to validate JSON data structure
export function isValidGogData(json: unknown): json is GogData {
  if (!json || typeof json !== "object") return false
  const data = json as Partial<GogData>
  return (
    typeof data.name === "string" &&
    Array.isArray(data.downloads) &&
    data.downloads.every(
      (dl) =>
        typeof dl === "object" &&
        dl !== null &&
        typeof dl.title === "string" &&
        typeof dl.fileSize === "string" &&
        typeof dl.uploadDate === "string" &&
        Array.isArray(dl.uris),
    )
  )
}

// Lightweight fetch with timeout using AbortController
export async function fetchWithTimeout(input: RequestInfo, init: RequestInit = {}, timeoutMs = 10000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(input, { ...init, signal: controller.signal })
    return res
  } finally {
    clearTimeout(id)
  }
}

// Process GOG data before adding
export function processGogData(json: GogData): GogData {
  return {
    ...json,
    downloads: json.downloads.map((dl: DownloadType) => ({
      ...dl,
      source: json.name,
    })),
  }
}

// Load a single source
export async function loadSingleSource(source: GogSourcesStoreItemWithData, callbacks: LoaderCallbacks): Promise<void> {
  const url = source.url
  try {
    if (processedUrlLoads.has(url)) return

    // Try cache first
    const cached = await getCachedUrl(url)
    if (cached) {
      processedUrlLoads.add(url)
      callbacks.onAddData(cached, url)
      return
    }

    // Check recent failures
    const lastFailed = failedUrlAt[url]
    if (lastFailed && Date.now() - lastFailed < FAILED_URL_RETRY_MS) return
    if (recentlyRemovedUrls.has(url) || recentlyRemovedUrls.has(source?.name || "")) return

    const res = await fetchWithTimeout(url)
    if (!res?.ok) {
      failedUrlAt[url] = Date.now()
      return
    }

    const text = await res.text().catch(() => "")
    const trimmed = text.trim()
    if (trimmed.startsWith("<")) {
      log.warn('NON-JSON-RESPONSE', { url })
      failedUrlAt[url] = Date.now()
      return
    }

    let json: any
    try {
      json = JSON.parse(text)
    } catch (parseError: any) {
      log.error('JSON-PARSE-ERROR', { url, error: parseError })
      failedUrlAt[url] = Date.now()
      callbacks.onError?.(parseError)
      return
    }

    if (!isValidGogData(json)) {
      failedUrlAt[url] = Date.now()
      return
    }

    await cacheUrlData(url, json)
    processedUrlLoads.add(url)
    callbacks.onAddData(json, url)
  } catch (err: any) {
    if (err?.name === "AbortError") {
      log.warn('FETCH-TIMEOUT', { url })
    }
    failedUrlAt[url] = Date.now()
    callbacks.onError?.(err)
  }
}

// Load multiple sources
export async function loadSources(sources: GogSourcesStoreItemWithData[], callbacks: LoaderCallbacks): Promise<void> {
  if (sources.length === 0) return

  try {
    callbacks.onLoadStart?.()

    const urlSources = sources.filter(
      (s): s is GogSourcesStoreItemWithData => s.type === "url" && typeof s.url === "string",
    )

    await Promise.all(urlSources.map((source) => loadSingleSource(source, callbacks)))
  } catch (err: any) {
    callbacks.onError?.(err)
  } finally {
    callbacks.onLoadEnd?.()
  }
}

// Mark source as removed
export function markSourceAsRemoved(sourceName: string, url?: string): void {
  if (url) {
    recentlyRemovedUrls.add(url)
    processedUrlLoads.add(url)
  }
  recentlyRemovedUrls.add(sourceName)
}

// Check if source is already processed
export function isSourceProcessed(url: string): boolean {
  return processedUrlLoads.has(url)
}

// Mark source as processed
export function markSourceAsProcessed(url: string): void {
  processedUrlLoads.add(url)
}

// Server data interfaces
export interface ServerSource {
  id: number
  name: string
}

// Server cache
let serverListCache: ServerSource[] = []

// Fetch server list
export async function fetchServerList(): Promise<ServerSource[]> {
  if (serverListCache.length > 0) return serverListCache

  try {
    const res = await fetch(`${API_BASE}/list`)
    if (res.ok) {
      serverListCache = await res.json()
      return serverListCache
    }
  } catch (e) {
    log.warn('FETCH-SERVER-LIST-FAILED', e)
  }
  return []
}

// Load source from server
export async function loadServerSource(
  source: GogSourcesStoreItemWithData,
  loadSavedSource: (id: string) => Promise<void>,
): Promise<boolean> {
  try {
    if (source.type === "file") {
      if ((source as any).__serverId) {
        await loadSavedSource(String((source as any).__serverId))
        markSourceAsProcessed(source.name || "")
        return true
      }

      // Try to find by name
      const serverList = await fetchServerList()
      const match = serverList.find((it) => it.name === source.name)
      if (match) {
        await loadSavedSource(String(match.id))
        markSourceAsProcessed(source.name || "")
        return true
      }
    }
  } catch (e) {
    log.warn('LOAD-SERVER-SOURCE-FAILED', e)
  }
  return false
}

// Filter state interface
export interface FilterState {
  searchQuery: string
  sortBy: "date" | "size" | "name"
  dateRange: { from?: Date; to?: Date }
  sizeRange: { min?: number; max?: number }
  searchMode: "all" | "any"
}

// Cache for search optimization
// - weakSearchCache: keyed by the DownloadType object (fast, GC-friendly)
// - persistentSearchCache: LRU cache with 5000 item limit to prevent memory leaks
const weakSearchCache = new WeakMap<DownloadType, { searchText: string; words: string[] }>()
const persistentSearchCache = new LRUCache<string, { searchText: string; words: string[]; title: string; uploadDate: string }>(
  5000,
  (key, value) => {
    // Optional: log when items are evicted
    log.debug('CACHE-EVICTED', { key, title: value.title })
  }
)
// Import search enhancements
import {
  expandSearchTermsWithSynonyms,
  getRecencyBonus,
  extractExactPhrases,
  checkExactPhrases,
} from "./types"

// Comprehensive stopwords list (EN + PT + RU) to ignore common words that reduce relevance
// English: common articles, prepositions, conjunctions, pronouns
// Portuguese: common articles, prepositions, conjunctions, pronouns
// Russian: common articles, prepositions, conjunctions, pronouns
const DEFAULT_STOPWORDS = new Set<string>([
  // English stopwords
  "the", "a", "an", "and", "or", "but", "if", "else", "while", "for", "to",
  "of", "in", "on", "at", "by", "from", "with", "without", "up", "down",
  "is", "am", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "should",
  "could", "can", "may", "might", "must", "shall",
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
  "my", "your", "his", "her", "its", "our", "their",
  "this", "that", "these", "those", "what", "which", "who", "whom", "why", "how",
  "as", "than", "into", "through", "during", "before", "after", "above", "below",
  "between", "under", "over", "out", "off", "about", "against", "along", "around",
  "such", "so", "some", "no", "not", "only", "just", "very", "too", "all", "each",
  
  // Portuguese stopwords
  "o", "a", "os", "as", "um", "uma", "uns", "umas",
  "de", "do", "da", "dos", "das", "e", "ou", "mais", "menos",
  "em", "no", "na", "nos", "nas", "por", "para", "com", "sem",
  "é", "são", "era", "eram", "foi", "foram", "ser", "estar",
  "tem", "têm", "tinha", "tinham", "teve", "tiveram", "ter",
  "eu", "tu", "você", "ele", "ela", "nós", "vós", "eles", "elas",
  "me", "te", "se", "lhe", "nos", "vos", "lhes",
  "meu", "teu", "seu", "nosso", "vosso", "dele", "dela",
  "este", "esse", "aquele", "este", "essa", "aquela",
  "que", "qual", "quais", "quanto", "quantos", "quanta", "quantas",
  "como", "quando", "onde", "porquê", "porque",
  "não", "sim", "talvez", "apenas", "só", "somente", "muito", "todo", "toda",
  
  // Russian stopwords
  "и", "в", "во", "не", "что", "он", "на", "я", "с", "со", "а", "то",
  "все", "она", "так", "его", "но", "да", "ты", "к", "у", "же", "вы",
  "за", "бы", "по", "только", "ее", "может", "они", "из", "ему", "еще",
  "нет", "от", "ни", "быть", "у", "ж", "вот", "ведь", "там", "тем",
  "чем", "себя", "ничего", "ей", "может", "они", "тот", "для", "потом",
  "себе", "ничего", "ей", "может", "они", "этот", "какая", "много", "разве",
  "три", "эту", "моя", "впрочем", "хоть", "после", "над", "больше",
  "тот", "через", "эти", "нас", "про", "всех", "них", "какая",
  "много", "разве", "три", "эту", "моя", "впрочем", "хоть", "after", "над",
  "больше", "тот", "через", "эти", "нас", "про", "всех", "них"
])

// Debug function - retorna TODOS os itens que contêm o termo em qualquer lugar,
// sem filtros, sem normalização, sem cache - busca bruta para debug
export function debugSearchResults(
  downloads: DownloadType[],
  searchQuery: string,
): DownloadType[] {
  if (!searchQuery?.trim()) return downloads
  if (!downloads?.length) return []

  const term = searchQuery.toLowerCase()
  log.debug('SEARCH-TERM', { term, totalDownloads: downloads.length })

  const results = downloads.filter(item => {
    if (!item?.title) {
      log.debug('ITEM-NO-TITLE', null)
      return false
    }

    const titleMatch = item.title.toLowerCase().includes(term)
    const sourceMatch = item.source?.toLowerCase().includes(term)

    if (titleMatch || sourceMatch) {
      log.debug('MATCH-FOUND', {
        title: item.title,
        source: item.source,
        matchTitle: titleMatch,
        matchSource: sourceMatch
      })
    }

    return titleMatch || sourceMatch
  })

  log.debug('SEARCH-RESULTS', {
    total: results.length,
    sample: results.slice(0, 3).map(d => ({ title: d.title, source: d.source }))
  })

  return results
}

// Parse file size
export function parseFileSize(sizeStr: string): number {
  if (!sizeStr || sizeStr === "N/A") return 0
  const match = sizeStr.match(/[\d.]+/)
  if (!match) return 0
  const num = Number.parseFloat(match[0])
  if (sizeStr.includes("GB")) return num * 1024 * 1024 * 1024
  if (sizeStr.includes("MB")) return num * 1024 * 1024
  if (sizeStr.includes("KB")) return num * 1024
  return num
}

  // Main filtering function
export function filterResults(
  downloads: DownloadType[],
  searchQuery: string,
  searchMode: "all" | "any",
): DownloadType[] {
  if (!searchQuery?.trim()) return downloads
  if (!downloads?.length) return []

  const { exactPhrases, remainingQuery } = extractExactPhrases(searchQuery)

  // Prepare search terms and remove stopwords
  const normalizedTerms = normalizeText(remainingQuery)
    .split(/\s+/)
    .filter((term) => term.length > 0)
  let searchTerms = normalizedTerms.filter((t) => !DEFAULT_STOPWORDS.has(t))
  if (searchTerms.length === 0) {
    searchTerms = normalizedTerms
  }

  const expandedSearchTerms = expandSearchTermsWithSynonyms(searchTerms)

  log.debug('FILTER-START', {
    query: searchQuery,
    normalizedQuery: normalizeText(searchQuery),
    searchTerms,
    expandedTerms: expandedSearchTerms,
    exactPhrases,
    totalDownloads: downloads.length
  })

  const scoredResults: { item: DownloadType; score: number }[] = []

  for (const item of downloads) {
    if (!item?.title) continue    // Check exact phrases first (if any)
    if (exactPhrases.length > 0) {
      // ✅ BUG #2.1 FIX: Usar valores pré-computados em vez de chamar normalizeText() aqui
      const normalizedTitle = `${item.titleNormalized || normalizeText(item.title)} ${item.sourceNormalized || normalizeText(item.source || "")}`
      if (!checkExactPhrases(normalizedTitle, exactPhrases)) {
        continue
      }
    }

    // Prepare and cache search text (try weak cache, then persistent cache)
    const persistentKey = `${item.title}:${item.uploadDate || ""}`
    let cached = weakSearchCache.get(item)
    let searchText: string
    let words: string[]

    if (!cached) {
      const persistent = persistentSearchCache.get(persistentKey)
      if (
        persistent &&
        persistent.title === item.title &&
        persistent.uploadDate === (item.uploadDate || "")
      ) {
        cached = { searchText: persistent.searchText, words: persistent.words }
        weakSearchCache.set(item, cached)
      }
    }

    if (!cached) {
      // ✅ BUG #2.1 FIX: Usar valores pré-computados em vez de chamar normalizeText() aqui
      const title = item.titleNormalized || normalizeText(item.title)
      const source = item.sourceNormalized || (item.source ? normalizeText(item.source) : "")
      const combined = `${title} ${source}`.replace(/\s+/g, " ").trim()
      searchText = ` ${combined} ` // Spaces for exact word matching
      words = combined.length ? combined.split(" ").filter((w) => w.length > 0) : []
      const newCached = { searchText, words }
      weakSearchCache.set(item, newCached)
      persistentSearchCache.set(persistentKey, {
        searchText,
        words,
        title: item.title,
        uploadDate: item.uploadDate || "",
      })
    } else {
      searchText = cached.searchText
      words = cached.words
    }

    const scoreForTerm = (term: string): number => {
      // Debug do scoring
      log.debug('SCORE-TERM', {
        term,
        title: item.title,
        exactMatches: words.filter(w => w === term).length,
        prefixMatches: words.filter(w => w.startsWith(term)).length,
        substringMatches: words.filter(w => w.includes(term)).length
      })

      // BUG #3.1 FIX: Melhorar pontuação de termos
      // Termos curtos têm baixa especificidade, penalizar
      if (term.length < 3) {
        // Apenas matches de palavra completa são válidos para termos curtos
        const isWordBoundary = new RegExp(`\\b${term}\\b`, 'i').test(searchText)
        return isWordBoundary ? 40 : 0  // Reduzido de 100 para 40
      }

      // Procura pela palavra em todo o texto
      if (searchText.includes(term)) {
        // Procura por correspondência exata da palavra
        const exactMatch = new RegExp(`\\b${term}\\b`, 'i').test(searchText)
        if (exactMatch) return 100
        
        // Procura por palavras que começam com o termo
        const prefixMatch = words.some(w => w.startsWith(term))
        if (prefixMatch) return 75  // Aumentado de 50 para 75
        
        // BUG #3.1 FIX: Substring match melhorado
        // Se encontrou substring, avaliar qualidade
        const substringWord = words.find(w => w.includes(term) && w !== term)
        if (substringWord) {
          // Quanto maior a substring relativa ao termo, melhor
          const ratio = term.length / substringWord.length
          if (ratio > 0.6) return 60  // Substring > 60% do word = bom match
          if (ratio > 0.4) return 45  // Substring 40-60% = match médio
          return 25  // Substring pequena = match fraco
        }
        
        // Fallback: encontrou em algum lugar mas sem limite de palavras
        return 15  // Aumentado de 10 para 15
      }
      return 0
    }

    let totalScore = 0
    let allMatched = true

    // Check original terms first (for searchMode "all")
    for (const term of searchTerms) {
      const s = scoreForTerm(term)
      if (s === 0) allMatched = false
      totalScore += s
    }

    // Add synonym matches with 70% weight
    const synonymTerms = expandedSearchTerms.filter((t) => !searchTerms.includes(t))
    for (const synTerm of synonymTerms) {
      const s = scoreForTerm(synTerm)
      if (s > 0) {
        totalScore += Math.floor(s * 0.7)
      }
    }

    // Add recency bonus if any match
    if (totalScore > 0) {
      totalScore += getRecencyBonus(item.uploadDate)
    }

    if (searchMode === "all" && !allMatched) continue
    if (searchMode === "any" && totalScore === 0) continue

    scoredResults.push({ item, score: totalScore })

    if (totalScore > 0) {
      log.debug('FILTER-MATCH', {
        title: item.title,
        terms: searchTerms,
        score: totalScore,
        recencyBonus: getRecencyBonus(item.uploadDate)
      })
    }
  }

  // Sort by score (descending) with title as tie-breaker
  scoredResults.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.item.title.toLowerCase().localeCompare(b.item.title.toLowerCase())
  })

  return scoredResults.map((r) => r.item)
}

// Process and filter downloads with all filters
export function processDownloads(downloads: DownloadType[], filters: FilterState): DownloadType[] {
  log.debug('PROCESS-START', {
    totalDownloads: downloads?.length || 0,
    filters
  })

  if (!downloads?.length) {
    log.debug('NO-DOWNLOADS', null)
    return []
  }

  let results = [...downloads] // Create copy to avoid mutation
  log.debug('INITIAL-COUNT', { count: results.length })

  // Apply search filter first
  if (filters.searchQuery?.trim()) {
    log.debug('SEARCH-FILTER-APPLY', { query: filters.searchQuery })
    const beforeSearch = results.length
    results = filterResults(results, filters.searchQuery, filters.searchMode)
    log.debug('SEARCH-FILTER-DONE', {
      before: beforeSearch,
      after: results.length,
      sample: results.slice(0, 3).map(r => r.title)
    })
  }

  // Apply date filter
  if (filters.dateRange.from || filters.dateRange.to) {
    log.debug('DATE-FILTER-APPLY', {
      from: filters.dateRange.from?.toISOString(),
      to: filters.dateRange.to?.toISOString()
    })
    const beforeDate = results.length
    results = results.filter((item) => {
      // BUG #3.2 FIX: Use getTime() for timezone-independent comparison
      // Item uploadDate is ISO string (UTC), convert to timestamp
      const uploadDateMs = new Date(item.uploadDate).getTime()
      const fromDateMs = filters.dateRange.from?.getTime() ?? 0
      const toDateMs = filters.dateRange.to?.getTime() ?? Infinity
      
      // Compare timestamps directly (works regardless of local timezone)
      return uploadDateMs >= fromDateMs && uploadDateMs <= toDateMs
    })
    log.debug('DATE-FILTER-DONE', {
      before: beforeDate,
      after: results.length
    })
  }

  // Apply size filter
  if (filters.sizeRange.min !== undefined || filters.sizeRange.max !== undefined) {
    log.debug('SIZE-FILTER-APPLY', {
      min: filters.sizeRange.min,
      max: filters.sizeRange.max
    })
    const beforeSize = results.length
    results = results.filter((item) => {
      const size = item.fileSizeBytes ?? parseFileSize(item.fileSize)
      if (size === 0) return filters.sizeRange.min === undefined || filters.sizeRange.min === 0
      if (filters.sizeRange.min !== undefined && size < filters.sizeRange.min) return false
      if (filters.sizeRange.max !== undefined && size > filters.sizeRange.max) return false
      return true
    })
    log.debug('SIZE-FILTER-DONE', {
      before: beforeSize,
      after: results.length
    })
  }

  // Apply sorting
  const sorted = [...results]
  if (filters.sortBy === "date") {
    log.debug('SORT-BY-DATE', null)
    sorted.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
  } else if (filters.sortBy === "name") {
    log.debug('SORT-BY-NAME', null)
    sorted.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()))
  } else if (filters.sortBy === "size") {
    log.debug('SORT-BY-SIZE', null)
    sorted.sort((a, b) => {
      const sizeA = a.fileSizeBytes ?? parseFileSize(a.fileSize)
      const sizeB = b.fileSizeBytes ?? parseFileSize(b.fileSize)
      return sizeB - sizeA
    })
  }

  log.debug('PROCESS-END', {
    total: sorted.length,
    sample: sorted.slice(0, 3).map(r => r.title)
  })

  return sorted
}

// Process downloads and remove duplicates
export function processAndDeduplicateDownloads(gogs: GogData[]): DownloadType[] {
  const processed = new Map()

  log.debug('DEDUP-START', { gogCount: gogs.length })

  const results = gogs.flatMap((gog) => {
    if (!gog.name) {
      log.debug('GOG-NO-NAME', null)
      return []
    }

    log.debug('PROCESS-GOG', {
      name: gog.name,
      downloadCount: gog.downloads?.length || 0
    })

    const filtered = gog.downloads
      .filter((dl) => {
        if (!dl?.title?.trim() || dl.title === "Wkeynhk") {
          log.debug('INVALID-DOWNLOAD', { title: dl?.title })
          return false
        }
        const key = `${dl.title}:${dl.uploadDate}`
        if (processed.has(key)) {
          log.debug('DUPLICATE-FOUND', { title: dl.title })
          return false
        }
        processed.set(key, true)
        return true
      })
      .map((dl) => ({
        ...dl,
        source: gog.name,
        fileSizeBytes: parseFileSize(dl.fileSize || ""),
      }))

    log.debug('GOG-FILTERED', { count: filtered.length })
    return filtered
  })

  log.debug('DEDUP-END', {
    total: results.length,
    sample: results.slice(0, 3).map(d => ({ title: d.title, source: d.source }))
  })

  return results
}
