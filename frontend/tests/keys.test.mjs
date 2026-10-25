import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import en from '../src/i18n/en.js';
import hi from '../src/i18n/hi.js';

// Catches the "shop.tagline shown on the page" mistake: every translation key written in the code must exist in English and in Hindi.
const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');
const get = (o, k) => k.split('.').reduce((a, p) => (a == null ? a : a[p]), o);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const groups = new Set(Object.keys(en));

test('every t(\'group.key\') used in the code exists in English and Hindi', () => {
  const missing = [];
  for (const f of walk(SRC).filter((x) => /\.jsx?$/.test(x) && !x.includes(`${path.sep}i18n${path.sep}`))) {
    const src = fs.readFileSync(f, 'utf8');
    const keys = [...src.matchAll(/\bt\(\s*['"`]([a-zA-Z_]+\.[a-zA-Z0-9_.-]+)['"`]/g)].map((m) => m[1]).filter((k) => groups.has(k.split('.')[0]));
    keys.push(...[...src.matchAll(/['"](shop|farmer)\.([a-zA-Z0-9_]+)['"]/g)].map((m) => `${m[1]}.${m[2]}`));   // keys kept in data, such as { title: 'shop.f1t' }
    for (const k of keys) for (const [name, d] of [['en', en], ['hi', hi]]) if (typeof get(d, k) !== 'string') missing.push(`${name}: ${k} (${path.relative(SRC, f)})`);
  }
  assert.deepEqual([...new Set(missing)], []);
});
