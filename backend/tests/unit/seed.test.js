import test from 'node:test';
import assert from 'node:assert/strict';
import { seedRequirement } from '../../services/calculatorService.js';
import { SEED_RATES, SEED_CROPS } from '../../data/seedRates.js';

const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) < tol, `${a} not near ${b}`);

test('illustrative example: 2 acres at 100 kg/ha is about 80.94 kg', () => {
  const r = seedRequirement({ area: 2, unit: 'acre', rate: 100, rateUnit: 'kg/ha' });
  near(r.areaHectare, 0.8094, 0.0001);
  near(r.totalSeedKg, 80.94);
});

test('kg/acre rates convert to kg/ha (40 kg/acre ~ 98.84 kg/ha)', () => {
  near(seedRequirement({ area: 1, unit: 'acre', rate: 40, rateUnit: 'kg/acre' }).totalSeedKg, 40, 0.001);
  near(seedRequirement({ area: 1, unit: 'hectare', rate: 40, rateUnit: 'kg/acre' }).totalSeedKg, 98.84, 0.01);
});

test('square metres and bigha', () => {
  near(seedRequirement({ area: 10000, unit: 'sqm', rate: 100, rateUnit: 'kg/ha' }).totalSeedKg, 100);
  assert.throws(() => seedRequirement({ area: 1, unit: 'bigha', rate: 10, rateUnit: 'kg/ha' }), /varies by region/);
  near(seedRequirement({ area: 3, unit: 'bigha', bighaSqm: 1333.33, rate: 20, rateUnit: 'kg/ha' }).totalSeedKg, 8.0, 0.01);
});

test('germination adjustment needs both values', () => {
  assert.throws(() => seedRequirement({ area: 1, unit: 'hectare', rate: 100, rateUnit: 'kg/ha', actualGermination: 80 }), /both germination/);
  near(seedRequirement({ area: 1, unit: 'hectare', rate: 100, rateUnit: 'kg/ha', assumedGermination: 90, actualGermination: 80 }).totalSeedKg, 112.5);
});

test('bags round up', () => {
  assert.equal(seedRequirement({ area: 1, unit: 'hectare', rate: 100, rateUnit: 'kg/ha', bagSizeKg: 40 }).bags, 3);
});

test('validation: empty, negative, zero, bad unit, absurd rate', () => {
  const ok = { area: 1, unit: 'acre', rate: 10, rateUnit: 'kg/ha' };
  assert.throws(() => seedRequirement({ ...ok, area: undefined }));
  assert.throws(() => seedRequirement({ ...ok, area: -2 }));
  assert.throws(() => seedRequirement({ ...ok, rate: 0 }));
  assert.throws(() => seedRequirement({ ...ok, rate: NaN }));
  assert.throws(() => seedRequirement({ ...ok, rateUnit: 'lb/ha' }));
  assert.throws(() => seedRequirement({ ...ok, rate: 99999 }));
  assert.throws(() => seedRequirement({ ...ok, unit: 'furlong' }));
});

test('every data record has a source document, PDF page, status, date and state; rates are positive', () => {
  assert.ok(SEED_RATES.length > 300, 'all records from both ICAR PDFs are loaded');
  const ids = new Set();
  for (const r of SEED_RATES) {
    assert.ok(!ids.has(r.id), `duplicate id ${r.id}`); ids.add(r.id);
    assert.ok(r.sourceDocument && r.sourceFile && Number.isInteger(r.sourcePage) && r.sourcePage > 0, r.id);
    assert.ok(r.verificationStatus && r.lastVerified && r.region && r.season && r.published, r.id);
    assert.ok(r.seedRate > 0 && (!r.seedRateMax || r.seedRateMax > r.seedRate), r.id);
    assert.ok(['kg/ha', 'kg/acre'].includes(r.unit), r.id);
    assert.ok(SEED_CROPS.some((c) => c.id === r.crop), r.id);
  }
});

test('every listed crop has at least one record, and every record passes the calculator sanity limit', () => {
  for (const c of SEED_CROPS) assert.ok(SEED_RATES.some((r) => r.crop === c.id), c.id);
  for (const r of SEED_RATES) assert.doesNotThrow(() => seedRequirement({ area: 1, unit: 'hectare', rate: r.seedRate, rateUnit: r.unit }), r.id);
});

test('crops with no sourced record in the PDFs are not invented (farmer adds them manually)', () => {
  for (const id of ['banana', 'tea', 'coffee', 'jowar-fodder-x']) assert.equal(SEED_RATES.filter((r) => r.crop === id).length, 0);
  assert.equal(SEED_CROPS.some((c) => c.id === 'banana'), false);
});

test('unit conversions from the PDFs: grams, quintals and tonnes become kg', () => {
  const tomatoAp = SEED_RATES.find((r) => r.id === 'tomato-andhra-pradesh-k1');
  assert.equal(tomatoAp.unit, 'kg/acre'); near(tomatoAp.seedRate, 0.06, 1e-9); near(tomatoAp.seedRateMax, 0.08, 1e-9);
  const potatoLadakh = SEED_RATES.find((r) => r.crop === 'potato' && r.region === 'Ladakh');
  assert.equal(potatoLadakh.seedRate, 2000);
  const cane = SEED_RATES.find((r) => r.crop === 'sugarcane' && r.region === 'Andhra Pradesh' && r.season.startsWith('Kharif'));
  assert.equal(cane.seedRate, 4000);
});

test('spot checks against the PDFs', () => {
  const get = (crop, region, variety) => SEED_RATES.find((r) => r.crop === crop && r.region === region && (!variety || r.variety === variety));
  assert.equal(get('wheat', 'Punjab', 'Unnat PBW 550').seedRate, 45);
  assert.equal(get('chickpea', 'Chhattisgarh').seedRate, 75);
  assert.equal(get('mustard', 'Haryana & Delhi', 'Irrigated').seedRate, 3.5);
  assert.equal(get('soybean', 'Himachal Pradesh').seedRateMax, 80);
});
