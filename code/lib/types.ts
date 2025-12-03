// Base interfaces for download and data structures
export interface DownloadType {
  fileSize: string
  uploadDate: string
  uris: string[]
  title: string
  // source is set during processing (from the parent GogData.name or when
  // loaded/normalized). Make it required to keep types consistent across
  // consumers that expect a string.
  source: string
  
  // ✅ Pré-computados ao carregar dados (BUG #2.1 fix)
  // Evita normalizeText() repetido durante buscas
  titleNormalized?: string
  sourceNormalized?: string
  urisNormalized?: string
  fileSizeBytes?: number
}

export interface GogData {
  name: string
  downloads: DownloadType[]
}

export type GogSourcesStoreItem = { name: string; url: string; type: "file" | "url"; lastUpdated: string }
// Allow optionally storing the parsed data for "force" persistence of uploaded files or fetched URLs
export type GogSourcesStoreItemWithData = GogSourcesStoreItem & { data?: GogData }

// Search enhancement types and utilities

// Mapeamento de sinônimos para termos comuns
export const SYNONYMS_MAP: Record<string, string[]> = {
  // Gaming
  skyrim: ["elder scrolls", "tes 5", "tesv", "the elder scrolls v"],
  witcher: ["the witcher 3", "tw3", "cdpr"],
  gta: ["grand theft auto", "rockstar games"],
  minecraft: ["mc", "mojang"],
  valorant: ["riot games", "tactical shooter"],

  // Gêneros
  rpg: ["role playing game", "roleplay", "character"],
  fps: ["first person shooter", "shooter"],
  moba: ["multiplayer online battle arena"],
  mmo: ["massively multiplayer online"],

  // Plataformas
  pc: ["windows", "steam", "pc game"],
  console: ["xbox", "playstation", "ps"],
  mobile: ["android", "ios", "smartphone"],

  // Qualidade/Versão
  remaster: ["remake", "hd", "enhanced edition", "deluxe"],
  mod: ["modification", "modpack", "addon"],
  dlc: ["expansion", "content pack", "season pass"],

  // Português
  jogo: ["game", "videogame"],
  edição: ["version", "build", "edition"],
  completo: ["complete", "full", "bundled"],
}

/**
 * Expande uma lista de termos de busca incluindo seus sinônimos
 */
export function expandSearchTermsWithSynonyms(terms: string[]): string[] {
  const expandedTerms = new Set<string>(terms)

  for (const term of terms) {
    const synonyms = SYNONYMS_MAP[term.toLowerCase()]
    if (synonyms) {
      synonyms.forEach((syn) => expandedTerms.add(syn))
    }
  }

  return Array.from(expandedTerms)
}

/**
 * Calcula quantos dias se passaram desde o upload
 */
export function daysSinceUpload(uploadDate: string): number {
  try {
    const uploadTime = new Date(uploadDate).getTime()
    const now = Date.now()
    return Math.floor((now - uploadTime) / (1000 * 60 * 60 * 24))
  } catch {
    return 999999 // Se data inválida, considera bem antiga
  }
}

/**
 * Calcula um bônus de pontuação baseado na data de upload
 */
export function getRecencyBonus(uploadDate: string): number {
  const days = daysSinceUpload(uploadDate)

  if (days <= 7) return 50 // Última semana: +50
  if (days <= 30) return 30 // Último mês: +30
  if (days <= 90) return 15 // Últimos 3 meses: +15
  if (days <= 180) return 5 // Últimos 6 meses: +5

  return 0 // Mais de 6 meses atrás
}

/**
 * Extrai frases exatas (entre aspas) de uma query de busca
 */
export function extractExactPhrases(query: string): {
  exactPhrases: string[]
  remainingQuery: string
} {
  const exactPhrases: string[] = []
  let remainingQuery = query

  // Regex para encontrar termos entre aspas duplas
  const phraseRegex = /"([^"]+)"/g
  let match

  while ((match = phraseRegex.exec(query)) !== null) {
    exactPhrases.push(match[1].trim())
  }

  // Remove as frases entre aspas da query
  remainingQuery = query.replace(/"[^"]*"/g, "").trim()

  return { exactPhrases, remainingQuery }
}

/**
 * Verifica se todas as frases exatas estão presentes em um texto
 */
export function checkExactPhrases(searchText: string, exactPhrases: string[]): boolean {
  if (exactPhrases.length === 0) return true

  // Normalizar searchText para comparação
  const normalized = searchText.toLowerCase().replace(/[\u0300-\u036f]/g, "") // Remove acentos

  for (const phrase of exactPhrases) {
    const normalizedPhrase = phrase.toLowerCase().replace(/[\u0300-\u036f]/g, "") // Remove acentos

    // Busca a frase como substring
    if (!normalized.includes(normalizedPhrase)) {
      return false
    }
  }

  return true
}
