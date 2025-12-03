import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normaliza texto removendo acentos, caracteres especiais, e normalizando espaços
 * 
 * Processo:
 * 1. Converte para minúsculas
 * 2. Normaliza Unicode (NFD) para separar acentos
 * 3. Remove acentos (\u0300-\u036f)
 * 4. Replace hyphens/underscores com espaço (para separar palavras)
 * 5. Remove caracteres não-alpanuméricos (SEM substituir por espaço, que causaria "Baldur's" → "Baldur s")
 * 6. Colapsa múltiplos espaços
 * 7. Trim
 * 
 * Exemplos:
 * - "Baldur's Gate" → "baldurs gate" (não "baldur s gate"!)
 * - "God of War™" → "god of war" (não deixa espaços extras)
 * - "Pokémon" → "pokemon"
 * - "The-Witcher_3" → "the witcher 3"
 */
export function normalizeText(text?: string): string {
  if (!text) return ""
  
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")        // Remove accents (combining diacritical marks)
    .replace(/[_-]+/g, " ")                 // Replace underscores and hyphens with space
    .replace(/[^\p{L}\p{N}\s]+/gu, "")      // Remove non-letter/number chars WITHOUT replacing with space!
    .replace(/\s+/g, " ")                   // Collapse multiple spaces into one
    .trim()
}
