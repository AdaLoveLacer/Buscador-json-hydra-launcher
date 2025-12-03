/**
 * TEST SUITE: Fix para "Showing 0 of 1000 results" bug
 * 
 * BUG: Search encontrava resultados mas não exibia nenhum
 * CAUSA: normalizeText estava trocando caracteres especiais por espaço
 *        "Baldur's Gate" → "Baldur s Gate" (SEM apóstrofo = palavra quebrada)
 *        Busca por "baldurs" não encontrava na lista de palavras
 * 
 * FIX: Mudar regex de .replace(/[^\p{L}\p{N}\s]+/gu, " ") 
 *      para .replace(/[^\p{L}\p{N}\s]+/gu, "")
 *      (remover o caractere especial SEM substituir por espaço)
 */

import { normalizeText } from "@/lib/utils"

interface TestCase {
  input: string
  expected: string
  description: string
  expectedSearchTerm?: string
}

const testCases: TestCase[] = [
  {
    input: "Baldur's Gate 3",
    expected: "baldurs gate 3",
    description: "Apóstrofo deve ser removido sem deixar espaço",
    expectedSearchTerm: "baldurs"
  },
  {
    input: "God of War™",
    expected: "god of war",
    description: "Símbolo™ deve ser removido",
    expectedSearchTerm: "war"
  },
  {
    input: "Pokémon",
    expected: "pokemon",
    description: "Acentos devem ser removidos",
    expectedSearchTerm: "pokemon"
  },
  {
    input: "The-Witcher_3",
    expected: "the witcher 3",
    description: "Hyphens e underscores devem virar espaço",
    expectedSearchTerm: "witcher"
  },
  {
    input: "Elden Ring",
    expected: "elden ring",
    description: "Nomes comuns sem caracteres especiais",
    expectedSearchTerm: "ring"
  },
  {
    input: "Diablo: Immortal",
    expected: "diablo immortal",
    description: "Dois pontos devem ser removidos",
    expectedSearchTerm: "immortal"
  },
  {
    input: "Half-Life 2: Episode One",
    expected: "half life 2 episode one",
    description: "Combinação de hyphen e dois pontos",
    expectedSearchTerm: "half"
  },
  {
    input: "Dragon's Dogma 2 - Dark Arisen's Quest",
    expected: "dragons dogma 2 dark arisens quest",
    description: "Múltiplos apóstrofos e hyphens",
    expectedSearchTerm: "dogma"
  },
  {
    input: "Final Fantasy VII (Remake)",
    expected: "final fantasy vii remake",
    description: "Parênteses devem ser removidos",
    expectedSearchTerm: "fantasy"
  },
  {
    input: "Persona 5: Royal's Ultimate Edition®™",
    expected: "persona 5 royals ultimate edition",
    description: "Múltiplos símbolos especiais",
    expectedSearchTerm: "royals"
  }
]

console.log("═══════════════════════════════════════════════════════")
console.log('  TEST SUITE: Fix "Showing 0 of 1000 results" bug')
console.log("═══════════════════════════════════════════════════════\n")

let passed = 0
let failed = 0

for (const test of testCases) {
  const normalized = normalizeText(test.input)
  const isCorrect = normalized === test.expected
  
  console.log(`${isCorrect ? "✅" : "❌"} ${test.description}`)
  console.log(`   Input:    "${test.input}"`)
  console.log(`   Expected: "${test.expected}"`)
  console.log(`   Got:      "${normalized}"`)
  
  if (test.expectedSearchTerm) {
    const words = normalized.split(" ").filter(w => w.length > 0)
    const found = words.some(w => w === test.expectedSearchTerm || w.startsWith(test.expectedSearchTerm!))
    console.log(`   Search term "${test.expectedSearchTerm}": ${found ? "✅ FOUND" : "❌ NOT FOUND"} in [${words.join(", ")}]`)
  }
  
  if (isCorrect) passed++
  else failed++
  
  console.log()
}

console.log("═══════════════════════════════════════════════════════")
console.log(`Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`)
console.log("═══════════════════════════════════════════════════════\n")

// SCENARIO TEST: Reproduce the exact bug scenario
console.log("SCENARIO TEST: Search for 'baldurs' in Baldur's Gate 3\n")

const downloadItem = {
  title: "Baldur's Gate 3 - Digital Deluxe Edition [v 4.1.1.6946847 + DLCs] (2023) PC | Portable",
  source: "Steam"
}

const titleNormalized = normalizeText(downloadItem.title)
const sourceNormalized = normalizeText(downloadItem.source)
const combined = `${titleNormalized} ${sourceNormalized}`.replace(/\s+/g, " ").trim()
const searchText = ` ${combined} `
const words = combined.split(" ").filter(w => w.length > 0)

const searchQuery = "baldurs"
const searchTermNormalized = normalizeText(searchQuery)

console.log(`Download title: "${downloadItem.title}"`)
console.log(`Search query:   "${searchQuery}"`)
console.log()
console.log(`Title normalized:  "${titleNormalized}"`)
console.log(`Source normalized: "${sourceNormalized}"`)
console.log(`Search combined:   "${combined}"`)
console.log()
console.log(`Words array: [${words.join(", ")}]`)
console.log()
console.log(`Search term normalized: "${searchTermNormalized}"`)
console.log(`searchText.includes("${searchTermNormalized}"): ${searchText.includes(searchTermNormalized)}`)
console.log()

if (searchText.includes(searchTermNormalized)) {
  const exactMatch = new RegExp(`\\b${searchTermNormalized}\\b`, 'i').test(searchText)
  console.log(`Exact word match: ${exactMatch ? "✅ YES" : "⚠️  NO (but prefix/substring match available)"}`)
  console.log(`Score: ${exactMatch ? "100" : "50"}`)
  console.log(`Result: ✅ WILL DISPLAY in search results`)
} else {
  console.log(`Exact word match: ❌ NO`)
  console.log(`Score: 0`)
  console.log(`Result: ❌ WILL NOT DISPLAY (BUG!)`)
}
