// Spelling-mistake tolerance for the offline guidance. Farmers type fast, on small keyboards, in Roman letters:
// "pilaa", "wlit", "tamater", "dhabe". Pure functions, no dependencies.

// Optimal string alignment distance: insert, delete, replace, or swap two neighbouring letters, each costs 1.
export function osa(a, b) {
  const m = a.length; const n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j += 1) d[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}

const LATIN = /^[a-z]+$/;
// Real English words that sit one letter away from a keyword ("bright" and "blight"). They are never treated as typing mistakes.
const REAL_WORDS = new Set(['bright', 'curly']);
const sameLetters = (a, b) => [...a].sort().join('') === [...b].sort().join('');

// Does the typed word match the keyword, allowing for a typing mistake? Short words are strict, because one wrong letter
// turns "rust" into "dust" or "rest". The first letter must be right: people rarely mistype that one, and it stops look-alikes.
export function sameWord(typed, word) {
  if (typed === word) return true;
  if (REAL_WORDS.has(typed)) return false;
  if (!LATIN.test(typed) || !LATIN.test(word) || word.length < 4) return false;
  if (typed[0] !== word[0] || Math.abs(typed.length - word.length) > 2) return false;
  if (word.length === 4) return typed.length === 4 && sameLetters(typed, word) && osa(typed, word) === 1;   // only two swapped letters
  return osa(typed, word) <= (word.length >= 8 ? 2 : 1);
}

export const tokens = (text) => String(text || '').split(/[^a-z]+/).filter(Boolean);

// A keyword can be several words ("white powder"): each word must match the next typed word.
export function phraseMatches(typedTokens, phrase) {
  const words = phrase.split(' ');
  for (let i = 0; i + words.length <= typedTokens.length; i += 1) {
    if (words.every((w, k) => sameWord(typedTokens[i + k], w))) return true;
  }
  return false;
}

// Devanagari spelling variants that mean the same: chandrabindu or bindu, with or without the nukta dot.
export const normDeva = (s) => String(s || '').replace(/\u093c/g, '').replace(/\u0901/g, '\u0902');
