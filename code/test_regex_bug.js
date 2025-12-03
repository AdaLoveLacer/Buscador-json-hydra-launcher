// Test regex word boundary issue
const searchText = ' baldurs gate 3 ';
const term = 'baldurs';
const words = ['baldurs', 'gate', '3'];

console.log('=== Testing word boundary regex ===');
console.log('searchText:', JSON.stringify(searchText));
console.log('term:', term);
console.log('words:', words);
console.log('');

// CURRENT (BROKEN) - using \b
const regexBroken = new RegExp(`\\b${term}\\b`, 'i');
console.log('❌ Current regex (\\b):', regexBroken.toString());
console.log('   Result:', regexBroken.test(searchText));
console.log('');

// FIXED - using space boundaries
const regexFixed = new RegExp(`(^|\\s)${term}(\\s|$)`, 'i');
console.log('✅ Fixed regex (spaces):', regexFixed.toString());
console.log('   Result:', regexFixed.test(searchText));
console.log('');

// SIMPLE TEST - just check if term is in words array
console.log('✅ Simple array check (words.includes):', words.includes(term));
console.log('');

// What actually happens in scoreForTerm
console.log('=== In scoreForTerm logic ===');
const exactMatch = words.filter(w => w === term).length > 0;
console.log('words.filter(w => w === term):', exactMatch);
console.log('This is why it works with the array but the regex fails');
