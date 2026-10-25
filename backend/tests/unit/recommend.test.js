import test from 'node:test';
import assert from 'node:assert/strict';
import { CROPS } from '../../data/cropSuitability.js';
import { SEASONS, SOILS, WATER_LEVELS, recommend } from '../../services/recommendService.js';

const ids = (r) => r.map((c) => c.id);
const status = (code) => (e) => e.status === code;

test('crop data is consistent: valid seasons, soils, water, days, unique ids', () => {
  assert.equal(new Set(CROPS.map((c) => c.id)).size, CROPS.length);
  for (const c of CROPS) {
    assert.ok(c.seasons.length && c.seasons.every((s) => SEASONS.includes(s)), c.id);
    assert.ok(WATER_LEVELS.includes(c.water), c.id);
    for (const s of [...c.soil.good, ...c.soil.ok]) assert.ok(SOILS.includes(s) && s !== 'unknown', `${c.id}: ${s}`);
    assert.equal(c.soil.good.filter((s) => c.soil.ok.includes(s)).length, 0, `${c.id} lists a soil as both good and ok`);
    assert.ok(c.days[0] > 0 && c.days[0] < c.days[1], c.id);
  }
});

test('season is a hard filter', () => {
  for (const c of recommend({ season: 'rabi', soil: 'alluvial', water: 'high' })) assert.ok(c.seasons.includes('rabi'), c.id);
  assert.ok(ids(recommend({ season: 'rabi', soil: 'alluvial', water: 'high' })).includes('wheat'));
  assert.equal(ids(recommend({ season: 'kharif', soil: 'alluvial', water: 'high' })).includes('wheat'), false);
});

test('a crop that needs more water than the farmer has is never suggested', () => {
  assert.equal(ids(recommend({ season: 'kharif', soil: 'alluvial', water: 'low' })).includes('rice'), false);
  assert.equal(ids(recommend({ season: 'kharif', soil: 'alluvial', water: 'medium' })).includes('rice'), false);
  assert.ok(ids(recommend({ season: 'kharif', soil: 'alluvial', water: 'high' })).includes('rice'));
  for (const w of WATER_LEVELS) for (const c of recommend({ season: 'rabi', soil: 'loamy', water: w })) assert.ok(WATER_LEVELS.indexOf(c.water) <= WATER_LEVELS.indexOf(w), `${c.id} at ${w}`);
});

test('an unsuitable soil removes the crop; unknown soil keeps it', () => {
  assert.equal(ids(recommend({ season: 'kharif', soil: 'sandy', water: 'high' })).includes('rice'), false);   // rice lists no sandy soil
  const unsure = recommend({ season: 'kharif', soil: 'unknown', water: 'high' });
  assert.ok(ids(unsure).includes('rice') && unsure.every((c) => c.soilFit === 'unknown'));
  assert.ok(unsure.length > recommend({ season: 'kharif', soil: 'sandy', water: 'high' }).length);
});

test('ranking: good soil beats ok soil, water match adds a point, ties are alphabetical', () => {
  const r = recommend({ season: 'rabi', soil: 'alluvial', water: 'medium' });
  const score = (id) => r.find((c) => c.id === id).score;
  assert.equal(score('wheat'), 3);        // good soil + medium water matches exactly
  assert.equal(score('mustard'), 2);      // good soil, but needs less water than available
  assert.equal(score('chickpea'), 1);     // ok soil, needs less water
  for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].score > r[i].score || (r[i - 1].score === r[i].score && r[i - 1].id < r[i].id));
});

test('bad input is refused with 422, never guessed', () => {
  assert.throws(() => recommend({ season: 'monsoon', soil: 'loamy', water: 'low' }), status(422));
  assert.throws(() => recommend({ season: 'rabi', soil: 'rock', water: 'low' }), status(422));
  assert.throws(() => recommend({ season: 'rabi', soil: 'loamy', water: 'lots' }), status(422));
  assert.throws(() => recommend({ soil: 'loamy', water: 'low' }), status(422));
});

test('with plenty of water, every season and common soil has at least one suggestion', () => {
  for (const season of SEASONS) for (const soil of ['alluvial', 'black', 'red', 'sandy', 'loamy', 'unknown']) assert.ok(recommend({ season, soil, water: 'high' }).length > 0, `${season}/${soil}`);
});

test('every crop has a guide with a category, valid sowing and harvest months and all the detail fields', async () => {
  const { GUIDE, CATEGORIES } = await import('../../data/cropGuide.js');
  assert.deepEqual(Object.keys(GUIDE).sort(), CROPS.map((c) => c.id).sort());
  for (const [id, g] of Object.entries(GUIDE)) {
    assert.ok(CATEGORIES.includes(g.category), id);
    for (const arr of [g.sow, g.harvest]) assert.ok(arr.length && arr.every((m) => Number.isInteger(m) && m >= 1 && m <= 12), id);
    for (const f of ['land', 'sowing', 'water', 'feed', 'yield']) assert.ok(typeof g[f] === 'string' && g[f].length > 10, `${id}.${f}`);
  }
});

test('a month filters by the crop own sowing months, and season "any" lists every crop that fits soil and water', () => {
  const oct = recommend({ month: 10, soil: 'loamy', water: 'high' });
  assert.ok(ids(oct).includes('wheat') && ids(oct).includes('potato'));
  assert.equal(ids(oct).includes('rice'), false);
  const jul = recommend({ month: 7, soil: 'alluvial', water: 'high' });
  assert.ok(ids(jul).includes('rice') && !ids(jul).includes('wheat'));
  for (const c of oct) assert.ok(c.sow.includes(10), c.id);
  assert.equal(recommend({ season: 'any', soil: 'unknown', water: 'high' }).length, CROPS.length);
  assert.throws(() => recommend({ month: 13, soil: 'loamy', water: 'low' }), status(422));
});
