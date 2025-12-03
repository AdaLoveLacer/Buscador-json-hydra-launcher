/**
 * Teste de validação da correção de normalizeText
 * 
 * Verifica que a função agora:
 * 1. Remove acentos
 * 2. Remove caracteres especiais
 * 3. Normaliza espaços
 * 4. Funciona corretamente na pré-computação e busca
 */

import { normalizeText } from "@/lib/utils"

console.log("=== TESTE DE VALIDAÇÃO: normalizeText ===\n")

// Casos de teste
const testCases = [
  {
    input: "Baldur's Gate 3",
    expected: "baldurs gate 3",
    description: "Remove apóstrofo"
  },
  {
    input: "God of War™",
    expected: "god of war",
    description: "Remove marca registrada"
  },
  {
    input: "The-Witcher_3",
    expected: "the witcher 3",
    description: "Replace hífen e underscore"
  },
  {
    input: "Pokémon Sword",
    expected: "pokemon sword",
    description: "Remove acentos"
  },
  {
    input: "Dragon's Dogma",
    expected: "dragons dogma",
    description: "Remove apóstrofo"
  },
  {
    input: "Witcher 3: Wild Hunt",
    expected: "witcher 3 wild hunt",
    description: "Remove dois pontos"
  },
  {
    input: "  Multiple   Spaces  ",
    expected: "multiple spaces",
    description: "Colapsa espaços múltiplos"
  },
  {
    input: "",
    expected: "",
    description: "String vazia"
  },
  {
    input: null as unknown as string,
    expected: "",
    description: "Null/undefined"
  },
  {
    input: "UPPERCASE",
    expected: "uppercase",
    description: "Converte para minúsculas"
  }
]

let passed = 0
let failed = 0

console.log("Executando testes...\n")

for (const testCase of testCases) {
  const result = normalizeText(testCase.input as any)
  const isPass = result === testCase.expected
  
  if (isPass) {
    passed++
    console.log(`✅ PASSOU: ${testCase.description}`)
    console.log(`   Input:    "${testCase.input}"`)
    console.log(`   Output:   "${result}"`)
    console.log(`   Expected: "${testCase.expected}"`)
  } else {
    failed++
    console.log(`❌ FALHOU: ${testCase.description}`)
    console.log(`   Input:    "${testCase.input}"`)
    console.log(`   Output:   "${result}"`)
    console.log(`   Expected: "${testCase.expected}"`)
  }
  console.log()
}

// Teste de cenário: busca em títulos com caracteres especiais
console.log("\n=== TESTE CENÁRIO: Busca em Dados Reais ===\n")

interface TestDownload {
  title: string
  titleNormalized?: string
}

const downloads: TestDownload[] = [
  { title: "Baldur's Gate 3" },
  { title: "God of War™" },
  { title: "The Witcher 3: Wild Hunt" },
  { title: "Pokémon Sword" },
  { title: "Dragon's Dogma" },
]

// Simular pré-computação
downloads.forEach(dl => {
  dl.titleNormalized = normalizeText(dl.title)
})

console.log("Dados pré-computados:")
downloads.forEach(dl => {
  console.log(`  "${dl.title}" → "${dl.titleNormalized}"`)
})

console.log("\nTestando buscas:")

const testSearches = [
  { query: "baldurs", shouldFind: ["Baldur's Gate 3"] },
  { query: "witcher", shouldFind: ["The Witcher 3: Wild Hunt"] },
  { query: "pokemon", shouldFind: ["Pokémon Sword"] },
  { query: "god war", shouldFind: ["God of War™"] },
  { query: "dragons", shouldFind: ["Dragon's Dogma"] },
]

for (const search of testSearches) {
  const normalizedQuery = normalizeText(search.query)
  const results = downloads.filter(dl => 
    dl.titleNormalized?.includes(normalizedQuery)
  )
  
  const found = results.map(r => r.title)
  const success = found.length > 0 && found.some(f => search.shouldFind.includes(f))
  
  console.log(`\nBusca: "${search.query}" (normalizado: "${normalizedQuery}")`)
  console.log(`  Esperado encontrar: ${search.shouldFind.join(", ")}`)
  console.log(`  Resultados: ${found.length > 0 ? found.join(", ") : "nenhum"}`)
  console.log(`  Status: ${success ? "✅ OK" : "❌ FALHOU"}`)
}

// Resumo final
console.log(`\n=== RESUMO ===`)
console.log(`Testes unitários: ${passed} passaram, ${failed} falharam`)
console.log(`Taxa de sucesso: ${((passed / (passed + failed)) * 100).toFixed(0)}%`)

if (failed === 0) {
  console.log("\n🎉 TODOS OS TESTES PASSARAM!")
} else {
  console.log("\n⚠️ ALGUNS TESTES FALHARAM - REVISAR IMPLEMENTAÇÃO")
}

export {}
