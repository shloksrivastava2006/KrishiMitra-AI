import test from 'node:test';
import assert from 'node:assert/strict';
import { getPrices, clearMandiCache, normalizeRecord, matchState, locate } from '../../services/mandiService.js';

const row = (o = {}) => ({ state: 'Uttar Pradesh', district: 'Meerut', market: 'Meerut', commodity: 'Wheat', variety: 'Dara', grade: 'FAQ', arrival_date: '18/10/2026', min_price: '2400', max_price: '2600', modal_price: '2500', ...o });
const mockFetch = (handler) => { const calls = []; globalThis.fetch = async (url) => { calls.push(String(url)); return handler(String(url)); }; return calls; };
const ok = (records) => ({ ok: true, status: 200, json: async () => ({ records }) });
const real = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = real; clearMandiCache(); delete process.env.DATA_GOV_API_KEY; });

test('normalizes a record (date and prices)', () => {
  const r = normalizeRecord(row());
  assert.equal(r.date, '2026-10-18'); assert.equal(r.modal, 2500); assert.equal(r.min, 2400);
});

test('needs the API key and a valid state', async () => {
  await assert.rejects(getPrices({ state: 'Punjab' }), /not set up/);
  process.env.DATA_GOV_API_KEY = 'k';
  await assert.rejects(getPrices({ state: 'Atlantis' }), /Choose a state/);
});

test('filters by district and market, lists options, sends the key only to data.gov.in', async () => {
  process.env.DATA_GOV_API_KEY = 'secret-key';
  const calls = mockFetch(() => ok([row(), row({ district: 'Agra', market: 'Agra', commodity: 'Potato' }), row({ market: 'Mawana', commodity: 'Rice' })]));
  const r = await getPrices({ state: 'Uttar Pradesh', district: 'Meerut' });
  assert.equal(r.count, 2);
  assert.deepEqual(r.options.districts, ['Agra', 'Meerut']);
  assert.deepEqual(r.options.markets, ['Mawana', 'Meerut']);
  assert.equal(r.latestDate, '2026-10-18');
  assert.ok(calls[0].startsWith('https://api.data.gov.in/resource/'));
  assert.ok(calls[0].includes('api-key=secret-key') && decodeURIComponent(calls[0]).includes('filters[state.keyword]=Uttar+Pradesh'));
  assert.ok(!JSON.stringify(r).includes('secret-key'));
});

test('caches results and tries the alternate state spelling when the first has no rows', async () => {
  process.env.DATA_GOV_API_KEY = 'k';
  const calls = mockFetch((url) => ok(url.includes('Uttrakhand') ? [row({ state: 'Uttrakhand', district: 'Dehradun' })] : []));
  const a = await getPrices({ state: 'Uttarakhand' });
  assert.equal(a.count, 1); assert.equal(calls.length, 2);
  await getPrices({ state: 'Uttarakhand' });
  assert.equal(calls.length, 2); // second call came from the cache
});

test('upstream problems become clear errors', async () => {
  process.env.DATA_GOV_API_KEY = 'k';
  mockFetch(() => ({ ok: false, status: 403, json: async () => ({}) }));
  await assert.rejects(getPrices({ state: 'Punjab' }), /key was rejected/);
  mockFetch(() => { throw new Error('offline'); });
  await assert.rejects(getPrices({ state: 'Haryana' }), /not reachable/);
});

import { COLD_STORAGES, COLD_STORAGE_PRINTED_TOTAL } from '../../data/coldStorages.js';
test('cold storage rows add up to the totals printed in the Lok Sabha annexure', () => {
  assert.equal(COLD_STORAGES.length, 33);
  assert.equal(COLD_STORAGES.reduce((s, r) => s + r.number, 0), COLD_STORAGE_PRINTED_TOTAL.number);
  assert.equal(COLD_STORAGES.reduce((s, r) => s + r.capacityMt, 0), COLD_STORAGE_PRINTED_TOTAL.capacityMt);
});

test('state names from OpenStreetMap or a profile map to the feed names', () => {
  assert.equal(matchState('Delhi'), 'NCT of Delhi'); assert.equal(matchState('uttar pradesh'), 'Uttar Pradesh');
  assert.equal(matchState('Orissa'), 'Odisha'); assert.equal(matchState('Jammu & Kashmir'), 'Jammu and Kashmir'); assert.equal(matchState('Narnia'), null);
});
test('GPS position becomes state and district (Meerut)', async () => {
  const calls = mockFetch(() => ({ ok: true, status: 200, json: async () => ({ address: { state_district: 'Meerut District', state: 'Uttar Pradesh', country: 'India' } }) }));
  assert.deepEqual(await locate(28.98, 77.7), { state: 'Uttar Pradesh', district: 'Meerut' });
  await locate(28.98, 77.7); assert.equal(calls.length, 1);
  await assert.rejects(locate(51.5, -0.12), /outside India/);
});
