// Sinônimos e aliases comuns
const SYNONYMS_MAP: Record<string, string[]> = {
  // RPGs e Games Fantasy
  "rpg": ["role-playing", "roleplaying", "jrpg", "crpg", "action-rpg"],
  "skyrim": ["elder scrolls", "tes", "bethesda", "scrolls"],
  "fallout": ["vault", "bethesda", "power armor", "vault boy"],
  "witcher": ["geralt", "cdpr", "cd projekt", "monster hunter"],
  "dragon": ["dragonborn", "dragons", "dungeons"],
  "elden": ["ring", "fromsoft", "souls"],
  "souls": ["soulslike", "souls-like", "dark souls", "elden ring"],
  "gta": ["grand theft auto", "rockstar", "sandbox crime"],
  "sandbox": ["open world", "freeform", "exploration"],
  "minecraft": ["blocks", "crafting", "building", "voxel"],
  "wow": ["world of warcraft", "mmorpg", "blizzard", "warcraft"],
  
  // Géneros
  "game": ["jogo", "gaming", "video game"],
  "jogo": ["game", "gaming"],
  "fps": ["first person", "shooter", "action"],
  "rts": ["strategy", "real-time", "command conquer"],
  "simulation": ["sim", "simulator", "simulated"],
  "adventure": ["explorer", "exploration", "quest"],
  "action": ["combat", "fighting", "battle"],
  "puzzle": ["logic", "brain teaser", "riddle"],
  "horror": ["terror", "scary", "survival horror"],
  "survival": ["survival horror", "crafting", "resource management"],
  "platformer": ["platform", "side-scroller", "jumping"],
  "racing": ["race", "car", "driving", "motorsport"],
  "sports": ["athletic", "competition", "esports"],
  "fighting": ["combat", "versus", "brawler", "fighter"],
  
  // Modificações e Conteúdo
  "mod": ["modification", "mods", "modding", "modificação", "modificacoes"],
  "patch": ["update", "fixes", "fixed", "hotfix", "correcao"],
  "dlc": ["expansion", "addon", "content", "pack", "season pass"],
  "skin": ["cosmetic", "outfit", "appearance", "texture pack"],
  "shader": ["graphics mod", "lighting", "visual enhancement"],
  "texture": ["textura", "textures", "texturas", "graphics", "visual"],
  "armor": ["equipment", "gear", "outfit", "suit"],
  "weapon": ["sword", "gun", "rifle", "tool", "item"],
  "magic": ["spell", "sorcery", "witchcraft", "enchantment"],
  "quest": ["mission", "objective", "task", "adventure"],
  
  // Funcionalidade e Ferramentas
  "fix": ["fixed", "fixing", "repair", "repaired", "correcao", "corrigido"],
  "tool": ["utility", "utils", "utilities", "ferramenta", "toolkit"],
  "install": ["installer", "setup", "installation", "instalacao"],
  "backup": ["saved", "copy", "copies", "save data", "savedata"],
  "save": ["savedata", "savefile", "savegame", "checkpoint"],
  "launcher": ["loader", "boot", "executor"],
  "manager": ["organizer", "controller", "handler"],
  "library": ["collection", "database", "catalog"],
  
  // Hardware e Performance
  "nvidia": ["geforce", "rtx", "gtx", "graphics card", "gpu"],
  "amd": ["radeon", "rx", "ryzen", "processor"],
  "intel": ["core", "processor", "cpu", "xeon"],
  "cpu": ["processor", "processador", "core", "intel", "amd", "ryzen"],
  "gpu": ["graphics", "video", "graphics card", "geforce", "radeon"],
  "ram": ["memory", "memoria", "ddr"],
  "ssd": ["solid state", "storage", "disk"],
  "hdd": ["hard drive", "disk", "mechanical"],
  
  // Resoluções e Qualidade
  "hd": ["high", "definition", "resolution", "1080p", "fullhd"],
  "4k": ["uhd", "ultra", "2160p", "8k"],
  "1080p": ["fullhd", "hd", "1920x1080"],
  "720p": ["hd ready", "720"],
  "resolution": ["quality", "definition", "graphics setting"],
  "framerate": ["frame rate", "performance", "60fps", "144fps"],
  "ultra": ["maximum", "high", "quality", "4k"],
  "high": ["quality", "settings", "ultra", "graphics"],
  "low": ["minimum", "settings", "performance", "lightweight"],
  
  // Audio e Vídeo
  "sound": ["audio", "som", "sound effects", "sfx"],
  "music": ["soundtrack", "musica", "ost", "score", "background music"],
  "voice": ["dialogue", "voicepack", "voice acting"],
  "subtitle": ["subtitles", "subs", "closed caption"],
  "audio": ["sound", "music", "voice", "sonoro"],
  "video": ["movie", "trailer", "cutscene", "cinema"],
  
  // Idiomas
  "pt": ["portuguese", "portugues", "brasil", "br", "português"],
  "en": ["english", "ingles", "us", "uk", "american", "british"],
  "es": ["spanish", "espanol", "espanha", "español"],
  "fr": ["french", "frances", "francais"],
  "de": ["german", "deutsch", "alemao"],
  "ru": ["russian", "russo", "cyrillic"],
  "ja": ["japanese", "japones", "nihongo"],
  "ch": ["chinese", "mandarin", "cantonese"],
  "ko": ["korean", "korean language"],
  "br": ["brazilian", "brasil", "portuguese"],
  "multilanguage": ["multi-language", "multilingual", "localization"],
  
  // Plataformas
  "pc": ["windows", "steam", "pc gaming"],
  "windows": ["pc", "win", "microsoft"],
  "linux": ["ubuntu", "debian", "proton"],
  "mac": ["osx", "macos", "apple"],
  "steam": ["valve", "platform", "pc gaming"],
  "epic": ["epic games", "launcher"],
  "gog": ["good old games", "drm-free"],
  "console": ["playstation", "xbox", "nintendo"],
  "playstation": ["ps4", "ps5", "sony"],
  "xbox": ["x360", "xone", "microsoft"],
  "switch": ["nintendo switch", "portable"],
  
  // Desenvolvedoras (expandido)
  "bethesda": ["skyrim", "fallout", "oblivion"],
  "cdpr": ["cd projekt", "witcher", "cyberpunk"],
  "fromsoft": ["elden ring", "dark souls", "bloodborne"],
  "valve": ["steam", "half-life", "portal"],
  "blizzard": ["wow", "diablo", "starcraft"],
  "rockstar": ["gta", "red dead", "max payne"],
  "ubisoft": ["assassins creed", "far cry", "splinter cell"],
  "activision": ["call of duty", "world of warcraft"],
  "ea": ["battlefield", "fifa", "sims"],
  "2k": ["bioshock", "borderlands", "civilization"],
  "capcom": ["resident evil", "monster hunter", "devil may cry"],
  "konami": ["metal gear", "castlevania", "silent hill"],
  "square": ["final fantasy", "dragon quest", "kingdom hearts"],
  "nintendo": ["mario", "zelda", "pokemon", "switch"],
  "sony": ["playstation", "god of war", "uncharted"],
  "microsoft": ["xbox", "halo", "gears of war"],
  
  // Categorias Gerais
  "complete": ["full", "entire", "100%", "all dlc"],
  "remaster": ["remake", "enhanced", "updated", "version"],
  "classic": ["old", "retro", "nostalgia", "vintage"],
  "new": ["latest", "recent", "updated", "novo"],
  "free": ["gratis", "opensource", "freeware"],
  "multiplayer": ["mp", "online", "coop", "pvp"],
  "singleplayer": ["single", "offline", "campaign"],
  "coop": ["co-op", "cooperative", "together"],
  "pvp": ["player vs player", "competitive", "multiplayer"],
  "online": ["internet", "network", "multiplayer"],
  "offline": ["local", "singleplayer", "no connection"],
}

// Normaliza uma frase removendo pontuação e espaços extras (BUG #3.5)
function normalizePhraseForMatching(phrase: string): string {
  return phrase
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove pontuação
    .replace(/\s+/g, ' ') // Normaliza espaços
}

// Extrai frases exatas (entre aspas) da query (BUG #3.5: Melhorado)
export function extractExactPhrases(query: string): { exactPhrases: string[]; remainingQuery: string } {
  const phrases: string[] = []
  let remaining = query

  // Regex para encontrar frases entre aspas (simples ou duplas)
  const regex = /"([^"]+)"|'([^']+)'/g
  let match

  while ((match = regex.exec(query)) !== null) {
    const phrase = match[1] || match[2]
    const normalized = normalizePhraseForMatching(phrase)
    if (normalized.length > 0) {
      phrases.push(normalized)
    }
    remaining = remaining.replace(match[0], '')
  }

  return {
    exactPhrases: phrases,
    remainingQuery: remaining.trim()
  }
}

// Verifica se todas as frases exatas estão presentes no texto (BUG #3.5: Melhorado)
export function checkExactPhrases(text: string, phrases: string[]): boolean {
  if (phrases.length === 0) return true

  const normalizedText = normalizePhraseForMatching(text)

  // Verificar cada frase como substring (agora com palavras normalizadas)
  return phrases.every(phrase => {
    // Busca exata de substring
    if (normalizedText.includes(phrase)) {
      return true
    }

    // Busca com palavras individuais (se a frase tem múltiplas palavras)
    const phraseWords = phrase.split(/\s+/).filter(w => w.length > 0)
    if (phraseWords.length > 1) {
      // Verificar se todas as palavras estão presentes (ordem não importa para frases multi-palavra)
      return phraseWords.every(word => 
        normalizedText.includes(word) || 
        normalizedText.split(/\s+/).some(w => w === word || w.startsWith(word))
      )
    }

    return false
  })
}

// Expande termos de busca com sinônimos
export function expandSearchTermsWithSynonyms(terms: string[]): string[] {
  const expanded = new Set<string>(terms)

  for (const term of terms) {
    // Verifica sinônimos diretos
    const directSynonyms = SYNONYMS_MAP[term]
    if (directSynonyms) {
      directSynonyms.forEach(syn => expanded.add(syn))
    }

    // Verifica sinônimos reversos
    for (const [key, synonyms] of Object.entries(SYNONYMS_MAP)) {
      if (synonyms.includes(term)) {
        expanded.add(key)
        synonyms.forEach(syn => expanded.add(syn))
      }
    }
  }

  return Array.from(expanded)
}

// Calcula bônus baseado na data de upload
export function getRecencyBonus(uploadDate?: string): number {
  if (!uploadDate) return 0

  const uploaded = new Date(uploadDate)
  const now = new Date()
  const ageInDays = Math.floor((now.getTime() - uploaded.getTime()) / (1000 * 60 * 60 * 24))

  // Bônus diminui com o tempo
  if (ageInDays <= 7) return 20 // últimos 7 dias
  if (ageInDays <= 30) return 10 // último mês
  if (ageInDays <= 90) return 5 // últimos 3 meses
  if (ageInDays <= 365) return 2 // último ano
  return 0 // mais antigo que 1 ano
}