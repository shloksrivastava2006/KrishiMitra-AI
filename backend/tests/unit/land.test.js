import test from 'node:test';
import assert from 'node:assert/strict';
import { convertLand, listLandStates } from '../../services/landService.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const row = (r, id) => r.results.find((x) => x.id === id);
const status = (code) => (e) => e.status === code;

test('manual factors: 2 kanal in Punjab = 0.1012 ha, 1 bigha in UP = 0.2530 ha (2,530 sq m)', () => {
  near(convertLand({ state: 'punjab', unit: 'kanal', value: 2 }).hectare, 0.1012);
  const up = convertLand({ state: 'uttar-pradesh', unit: 'bigha', value: 1 });
  near(up.hectare, 0.253); near(row(up, 'sqm').value, 2530, 1e-3);
});

test('a result lists the standard units plus only that state local units', () => {
  const hr = convertLand({ state: 'haryana', unit: 'acre', value: 1 });
  assert.deepEqual(hr.results.filter((r) => r.local).map((r) => r.id), ['kanal', 'marla', 'bigha']);
  near(row(hr, 'hectare').value, 0.404686);
  near(row(hr, 'kanal').value, 0.404686 / 0.0506, 1e-6);
  assert.equal(convertLand({ state: 'tamil-nadu', unit: 'hectare', value: 3 }).results.length, 4);   // hectare-only states
});

test('1 bigha = 20 bishwa (UP and Rajasthan), 1 bishwa = 20 bishwansi, not the values printed in the manual', () => {
  const up = convertLand({ state: 'uttar-pradesh', unit: 'acre', value: 1.013 });
  near(row(up, 'bigha').value, 1.013 * 0.404686 / 0.253, 1e-9);
  near(row(up, 'bishwa').value, row(up, 'bigha').value * 20, 1e-9);          // about 32.4, not 2.53
  assert.ok(row(up, 'bishwa').value > 30 && row(up, 'bishwa').value < 35);
  const rj = convertLand({ state: 'rajasthan', unit: 'bigha', value: 1 });
  near(row(rj, 'bishwa').value, 20, 1e-9); near(row(rj, 'bishwansi').value, 400, 1e-9);
  assert.equal(row(up, 'bishwa').derived, true); assert.ok(row(up, 'bishwa').note.includes('20 Bishwa'));
});

test('Andhra Pradesh cent uses 0.0040 ha (about 40 sq m), the same as Karnataka and Kerala', () => {
  near(row(convertLand({ state: 'andhra-pradesh', unit: 'cent', value: 1 }), 'sqm').value, 40, 1e-9);
  near(row(convertLand({ state: 'kerala', unit: 'cent', value: 1 }), 'sqm').value, 40, 1e-9);
});

test('the one value that disagrees with its own remark is still flagged: Uttarakhand bigha', () => {
  const r = convertLand({ state: 'uttarakhand', unit: 'bigha', value: 1 });
  assert.equal(r.input.check, true); assert.ok(r.input.note.length > 20);
  assert.equal(convertLand({ state: 'karnataka', unit: 'cent', value: 1 }).input.check, false);
});

test('Uttarakhand nali and muthi come from the manual remarks (1 nali = 200 sq m, 16 muthi = 1 nali)', () => {
  const r = convertLand({ state: 'uttarakhand', unit: 'nali', value: 1 });
  near(row(r, 'sqm').value, 200, 1e-3); near(row(r, 'muthi').value, 16, 1e-6);
});

test('every state has an id, name and valid unit factors; bad input is refused with 422', () => {
  const { states } = listLandStates();
  assert.equal(states.length, 21);
  for (const s of states) for (const u of s.units) assert.ok(u.hectare > 0 && u.id && u.name, `${s.id}/${u.id}`);
  assert.throws(() => convertLand({ state: 'atlantis', unit: 'acre', value: 1 }), status(422));
  assert.throws(() => convertLand({ state: 'punjab', unit: 'bishwa', value: 1 }), status(422));   // not a Punjab unit
  assert.throws(() => convertLand({ state: 'punjab', unit: 'acre', value: 0 }), status(422));
});
