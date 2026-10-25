import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuery, distanceKm, isColdStorageName, normalizePlace, searchColdStorages, clearColdStorageCache } from '../../services/coldStorageService.js';

const fake = (places, status = 200) => async () => ({ ok: status === 200, status, json: async () => ({ places }) });
const P = (id, name, lat, lon, extra = {}) => ({ id, displayName: { text: name }, formattedAddress: `${name} addr`, location: { latitude: lat, longitude: lon }, ...extra });

test('query is built from place, district and state', () => {
  assert.equal(buildQuery({ state: 'Uttar Pradesh', district: 'Meerut', place: 'Mawana' }), 'cold storage in Mawana, Meerut, Uttar Pradesh');
  assert.equal(buildQuery({ state: 'Punjab' }), 'cold storage in Punjab');
});
test('names: cold storages kept, movers and self storage dropped', () => {
  assert.ok(isColdStorageName('Shree Ram Cold Storage'));
  assert.ok(!isColdStorageName('Agarwal Packers and Movers'));
  assert.ok(!isColdStorageName('Safe Self Storage'));
  assert.ok(!isColdStorageName('Sharma Sweets'));
});
test('distance Meerut to Delhi is about 60 km', () => {
  const d = distanceKm(28.9845, 77.7064, 28.6139, 77.209);
  assert.ok(d > 55 && d < 70, String(d));
});
test('missing key is a clear 503, bad state a 422', async () => {
  delete process.env.GOOGLE_PLACES_API_KEY; clearColdStorageCache();
  await assert.rejects(() => searchColdStorages({ state: 'Punjab' }, fake([])), { status: 503 });
  process.env.GOOGLE_PLACES_API_KEY = 'test-key';
  await assert.rejects(() => searchColdStorages({ state: 'Narnia' }, fake([])), { status: 422 });
  await assert.rejects(() => searchColdStorages({}, fake([])), { status: 422 });
  await assert.rejects(() => searchColdStorages({ lat: 51, lon: 0 }, fake([])), { status: 422 });
});
test('search filters, drops permanently closed, sorts nearest first when GPS is given', async () => {
  process.env.GOOGLE_PLACES_API_KEY = 'test-key'; clearColdStorageCache();
  const places = [
    P('far', 'Far Cold Storage', 29.3, 77.9), P('near', 'Near Himghar', 28.99, 77.71, { nationalPhoneNumber: '0121 000000' }),
    P('gone', 'Old Cold Storage', 28.98, 77.7, { businessStatus: 'CLOSED_PERMANENTLY' }), P('x', 'Gupta Packers', 28.98, 77.7),
  ];
  const out = await searchColdStorages({ state: 'uttar pradesh', district: 'Meerut', lat: 28.9845, lon: 77.7064 }, fake(places));
  assert.deepEqual(out.items.map((i) => i.id), ['near', 'far']);
  assert.equal(out.items[0].phone, '0121 000000');
  assert.ok(out.items[0].distanceKm < 2);
  assert.equal(out.hiddenCount, 2);
  assert.match(out.notListed, /Capacity/);
});
test('Google errors become clear messages; nothing invented', async () => {
  process.env.GOOGLE_PLACES_API_KEY = 'test-key'; clearColdStorageCache();
  await assert.rejects(() => searchColdStorages({ state: 'Punjab' }, fake([], 403)), { status: 503 });
  clearColdStorageCache();
  await assert.rejects(() => searchColdStorages({ state: 'Punjab' }, async () => { throw new Error('net'); }), { status: 502 });
  clearColdStorageCache();
  const out = await searchColdStorages({ state: 'Punjab' }, fake([]));
  assert.equal(out.count, 0);
  assert.equal(normalizePlace({ id: 'a', displayName: { text: 'A' } }).phone, '');
});
