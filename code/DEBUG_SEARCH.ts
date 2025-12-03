/**
 * Script de debug para testar a função de pesquisa
 * Ajuda a identificar por que nenhum resultado é retornado
 */

import { filterResults, debugSearchResults } from "@/lib/search"
import type { DownloadType } from "@/lib/types"

// Dados de teste
const testDownloads: DownloadType[] = [
  {
    title: "The Witcher 3: Wild Hunt",
    source: "GOG",
    fileSize: "50 GB",
    uploadDate: "2025-01-10T12:00:00Z",
    uris: ["https://example.com/witcher3.zip"],
    fileSizeBytes: 53687091200,
    titleNormalized: "the witcher 3 wild hunt",
    sourceNormalized: "gog",
    urisNormalized: "https example com witcher3 zip"
  },
  {
    title: "Cyberpunk 2077",
    source: "GOG",
    fileSize: "70 GB",
    uploadDate: "2025-01-09T12:00:00Z",
    uris: ["https://example.com/cyberpunk.zip"],
    fileSizeBytes: 75161927680,
    titleNormalized: "cyberpunk 2077",
    sourceNormalized: "gog",
    urisNormalized: "https example com cyberpunk zip"
  },
  {
    title: "Elden Ring",
    source: "Steam",
    fileSize: "60 GB",
    uploadDate: "2025-01-08T12:00:00Z",
    uris: ["https://example.com/eldenring.zip"],
    fileSizeBytes: 64424509440,
    titleNormalized: "elden ring",
    sourceNormalized: "steam",
    urisNormalized: "https example com eldenring zip"
  },
  {
    title: "Baldur's Gate 3",
    source: "Steam",
    fileSize: "150 GB",
    uploadDate: "2025-01-07T12:00:00Z",
    uris: ["https://example.com/baldursgate3.zip"],
    fileSizeBytes: 161061273600,
    titleNormalized: "baldurs gate 3",
    sourceNormalized: "steam",
    urisNormalized: "https example com baldursgate3 zip"
  }
]

console.log("=== TESTE DE PESQUISA ===\n")
console.log(`Total de downloads de teste: ${testDownloads.length}\n`)

// Teste 1: Busca simples por "witcher"
console.log("--- TESTE 1: Busca por 'witcher' ---")
const result1 = filterResults(testDownloads, "witcher", "any")
console.log(`Resultados encontrados: ${result1.length}`)
if (result1.length > 0) {
  result1.forEach(item => console.log(`  ✓ ${item.title}`))
} else {
  console.log(`  ✗ Nenhum resultado encontrado!`)
}

// Teste 2: Busca por "GOG"
console.log("\n--- TESTE 2: Busca por 'GOG' ---")
const result2 = filterResults(testDownloads, "GOG", "any")
console.log(`Resultados encontrados: ${result2.length}`)
if (result2.length > 0) {
  result2.forEach(item => console.log(`  ✓ ${item.title} (${item.source})`))
} else {
  console.log(`  ✗ Nenhum resultado encontrado!`)
}

// Teste 3: Busca por número "2077"
console.log("\n--- TESTE 3: Busca por '2077' ---")
const result3 = filterResults(testDownloads, "2077", "any")
console.log(`Resultados encontrados: ${result3.length}`)
if (result3.length > 0) {
  result3.forEach(item => console.log(`  ✓ ${item.title}`))
} else {
  console.log(`  ✗ Nenhum resultado encontrado!`)
}

// Teste 4: Busca por múltiplos termos
console.log("\n--- TESTE 4: Busca por 'baldurs gate' (múltiplos termos) ---")
const result4 = filterResults(testDownloads, "baldurs gate", "any")
console.log(`Resultados encontrados: ${result4.length}`)
if (result4.length > 0) {
  result4.forEach(item => console.log(`  ✓ ${item.title}`))
} else {
  console.log(`  ✗ Nenhum resultado encontrado!`)
}

// Teste 5: Debug com função bruta
console.log("\n--- TESTE 5: Debug bruto (sem normalização) ---")
const result5 = debugSearchResults(testDownloads, "Witcher")
console.log(`Resultados encontrados (busca bruta): ${result5.length}`)
if (result5.length > 0) {
  result5.forEach(item => console.log(`  ✓ ${item.title}`))
} else {
  console.log(`  ✗ Nenhum resultado encontrado!`)
}

// Teste 6: Verificar a normalização
console.log("\n--- TESTE 6: Verificação de dados ---")
testDownloads.forEach(item => {
  console.log(`Título: "${item.title}"`)
  console.log(`  Normalizado: "${item.titleNormalized}"`)
  console.log(`  Fonte: "${item.source}"`)
  console.log(`  Fonte normalizada: "${item.sourceNormalized}"`)
  console.log()
})

export {}
