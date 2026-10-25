import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILT_IN, GOOGLE_LANGS, HINDI_MODE, clearGoogtrans, dictionaryLangFor, googtransValue, includedLanguages, installTranslateGuard, isGoogleLang, readGoogtrans, setGoogtrans, usesGoogle,
} from '../src/i18n/googleTranslate.js';

test('language list: unique codes and names, none overlapping the built-in languages', () => {
  const codes = GOOGLE_LANGS.map((l) => l.code);
  assert.equal(new Set(codes).size, codes.length);
  assert.equal(new Set(GOOGLE_LANGS.map((l) => l.label)).size, codes.length);
  for (const l of GOOGLE_LANGS) { assert.ok(l.label.trim().length > 1, l.code); assert.ok(!BUILT_IN.includes(l.code), l.code); }
  for (const c of ['bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'or', 'as', 'ur']) assert.ok(isGoogleLang(c), c);
  assert.equal(includedLanguages().split(',').length, codes.length + 1);   // the list above plus Hindi
  assert.ok(includedLanguages().split(',').includes('hi'));
});

test('only known codes are accepted', () => {
  for (const bad of ['en', 'xx', '', undefined, null, 5, '__proto__', 'ta,te', 'ta ']) assert.equal(isGoogleLang(bad), false, String(bad));
  assert.equal(isGoogleLang('hi'), true);                          // Hindi is a Google target too (see HINDI_MODE)
  assert.equal(googtransValue('ta'), '/en/ta');
});

test('reading the googtrans cookie: valid, encoded, among other cookies; anything else is ignored', () => {
  assert.equal(readGoogtrans('googtrans=/en/ta'), 'ta');
  assert.equal(readGoogtrans('a=1; googtrans=%2Fen%2Fbn; b=2'), 'bn');
  assert.equal(readGoogtrans('googtrans=/auto/mr'), 'mr');
  assert.equal(readGoogtrans('googtrans=/en/mni-Mtei'), 'mni-Mtei');
  assert.equal(readGoogtrans(''), ''); assert.equal(readGoogtrans(undefined), '');
  assert.equal(readGoogtrans('xgoogtrans=/en/ta'), '');            // a different cookie name
  assert.equal(readGoogtrans('googtrans=/en/hi'), 'hi');
  assert.equal(readGoogtrans('googtrans=/en/zz'), '');              // not in our list
  assert.equal(readGoogtrans('googtrans=/en/ta"><script>'), '');    // junk
  assert.equal(readGoogtrans('googtrans=%E0%A4%A'), '');            // malformed escape does not throw
});

test('writing and clearing the cookie', () => {
  const writes = [];
  globalThis.document = { get cookie() { return ''; }, set cookie(v) { writes.push(v); } };
  try {
    globalThis.window = { location: { hostname: 'krishimitra.example.in' } };
    setGoogtrans('ta'); setGoogtrans('evil');
    assert.equal(writes.length, 1); assert.match(writes[0], /^googtrans=\/en\/ta; path=\//);
    writes.length = 0; clearGoogtrans();
    assert.equal(writes.length, 3);                                  // bare host, domain=host, domain=.host
    assert.ok(writes.every((w) => /^googtrans=;/.test(w) && /1970/.test(w)));
    assert.ok(writes.some((w) => w.endsWith('domain=.krishimitra.example.in')));
    writes.length = 0; globalThis.window = { location: { hostname: 'localhost' } }; clearGoogtrans();
    assert.equal(writes.length, 1);                                  // no domain cookie for localhost
  } finally { delete globalThis.document; delete globalThis.window; }
});

test('React guard: ignores nodes Google already moved, passes everything else through, installs once', () => {
  installTranslateGuard();                                           // no Node global in plain Node: must not throw
  const calls = [];
  class FakeNode { removeChild(c) { calls.push(['remove', c]); return c; } insertBefore(n, r) { calls.push(['insert', n, r]); return n; } }
  globalThis.Node = FakeNode;
  try {
    installTranslateGuard(); installTranslateGuard();
    const parent = new FakeNode(); const mine = { parentNode: parent }; const moved = { parentNode: {} };
    assert.equal(parent.removeChild(mine), mine); assert.equal(calls.length, 1);
    assert.equal(parent.removeChild(moved), moved); assert.equal(calls.length, 1);          // skipped, no error
    assert.equal(parent.insertBefore('n', mine), 'n'); assert.equal(calls.length, 2);
    assert.equal(parent.insertBefore('n', moved), 'n'); assert.equal(calls.length, 2);      // skipped
    assert.equal(parent.insertBefore('n', null), 'n'); assert.equal(calls.length, 3);       // append still works
  } finally { delete globalThis.Node; }
});

test('Hindi modes: which dictionary sits under Google, and whether Google starts at all', () => {
  assert.equal(HINDI_MODE, 'hybrid');
  // hybrid: hand-written Hindi stays underneath Hindi; every other Google language sits on English
  assert.equal(dictionaryLangFor('hi', 'en', 'hybrid'), 'hi');
  assert.equal(dictionaryLangFor('ta', 'hi', 'hybrid'), 'en');
  assert.equal(dictionaryLangFor('', 'hi', 'hybrid'), 'hi');         // no translation: the saved built-in language
  assert.equal(dictionaryLangFor('', 'en', 'hybrid'), 'en');
  // google-only: Hindi behaves like Tamil
  assert.equal(dictionaryLangFor('hi', 'hi', 'google-only'), 'en');
  // dictionary: Hindi never starts Google; other languages still do
  assert.equal(usesGoogle('hi', 'dictionary'), false); assert.equal(usesGoogle('ta', 'dictionary'), true);
  assert.equal(usesGoogle('hi', 'hybrid'), true); assert.equal(usesGoogle('hi', 'google-only'), true);
  assert.equal(usesGoogle('en'), false); assert.equal(usesGoogle('xx'), false);
});
