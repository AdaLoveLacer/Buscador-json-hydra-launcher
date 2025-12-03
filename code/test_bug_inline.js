// Inline normalizeText para testar (CORRIGIDO)
function normalizeText(text) {
  if (!text) return ""
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")        // Remove accents
    .replace(/[_-]+/g, " ")                 // Replace underscores/hyphens with space
    .replace(/[^\p{L}\p{N}\s]+/gu, "")      // Remove special chars WITHOUT space!
    .replace(/\s+/g, " ")                   // Collapse spaces
    .trim()
}

const item = {
  title: "Baldur's Gate 3 - Digital Deluxe Edition [v 4.1.1.6946847 + DLCs] (2023) PC | Portable",
  titleNormalized: undefined, // <- TESTANDO: se undefined, deve calcular
  source: "Steam",
  sourceNormalized: undefined
};

const searchQuery = "baldurs";

console.log('=== REPRODUZINDO BUG ===\n');

// Simulando a normalização do termo buscado
const normalizedQuery = normalizeText(searchQuery);
console.log('Termo buscado normalizado:', normalizedQuery);

// Simulando o que acontece em filterResults (linhas 346-370)
const title = item.titleNormalized || normalizeText(item.title);
const source = item.sourceNormalized || (item.source ? normalizeText(item.source) : "");
const combined = `${title} ${source}`.replace(/\s+/g, " ").trim();
const searchText = ` ${combined} `;
const words = combined.split(" ").filter(w => w.length > 0);

console.log('\nTítulo original:', item.title);
console.log('titleNormalized do item:', item.titleNormalized);
console.log('Normalizado calculado:', title);
console.log('\nSource:', item.source);
console.log('sourceNormalized:', source);
console.log('\nCombinado:', combined);
console.log('searchText:', searchText);
console.log('words array:', words);

// Test scoreForTerm
const term = normalizedQuery;
console.log('\n=== scoreForTerm logic ===');
console.log('term:', term);
console.log('term.length:', term.length);
console.log('searchText.includes(term):', searchText.includes(term));

const exactMatches = words.filter(w => w === term).length;
const prefixMatches = words.filter(w => w.startsWith(term)).length;
const substringMatches = words.filter(w => w.includes(term)).length;

console.log('exactMatches:', exactMatches);
console.log('prefixMatches:', prefixMatches);
console.log('substringMatches:', substringMatches);

// Full test
console.log('\n=== Score calculation ===');
if (term.length < 3) {
  console.log('term < 3 chars: check if term is in searchText');
  const score = searchText.includes(term) ? 100 : 0;
  console.log('Score:', score);
} else {
  console.log('term >= 3 chars');
  if (searchText.includes(term)) {
    console.log('  ✓ term found in searchText');
    const exactMatch = new RegExp(`\\b${term}\\b`, 'i').test(searchText);
    console.log('  exactMatch regex (\\b):', exactMatch);
    if (exactMatch) {
      console.log('  → Score: 100 ✅');
    } else {
      const prefixMatch = words.some(w => w.startsWith(term));
      console.log('  prefixMatch array:', prefixMatch);
      console.log('  → Score:', prefixMatch ? 50 : 10);
    }
  } else {
    console.log('  ✗ term NOT found in searchText');
    console.log('  → Score: 0 ❌ BUG!');
  }
}
