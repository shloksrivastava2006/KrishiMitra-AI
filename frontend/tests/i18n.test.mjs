import test from 'node:test';
import assert from 'node:assert/strict';
import { dictionaries, translate } from '../src/i18n/translate.js';

const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? flat(v, `${p}${k}.`) : [`${p}${k}`]));

test('Hindi has exactly the same keys as English', () => {
  assert.deepEqual(flat(dictionaries.hi).sort(), flat(dictionaries.en).sort());
});
test('language switch changes the text', () => {
  assert.equal(translate('en', 'nav.logout'), 'Log out');
  assert.notEqual(translate('hi', 'nav.logout'), translate('en', 'nav.logout'));
});
test('variables are substituted and unknown keys fall back to the key', () => {
  assert.match(translate('en', 'auth.loginSuccess', { name: 'Asha' }), /Asha/);
  assert.equal(translate('hi', 'nope.missing'), 'nope.missing');
});
