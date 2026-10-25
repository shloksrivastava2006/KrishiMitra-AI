import test from 'node:test';
import assert from 'node:assert/strict';
import { convertArea, fertilizerQuantity } from '../../services/calculatorService.js';

test('1 hectare is about 2.471 acres', () => {
  assert.ok(Math.abs(convertArea({ value: 1, unit: 'hectare' }).acre - 2.4711) < 0.001);
});

test('bigha requires a local size', () => {
  assert.throws(() => convertArea({ value: 1, unit: 'bigha' }), /varies by region/);
  assert.equal(convertArea({ value: 2, unit: 'bigha', bighaSqm: 2500 }).sqm, 5000);
});

test('urea quantity matches hand calculation (120 kg N/ha, 2 ha, 46% N = 521.7 kg)', () => {
  const r = fertilizerQuantity({ area: 2, unit: 'hectare', nutrientRateKgPerHa: 120, nutrientPercent: 46 });
  assert.ok(Math.abs(r.fertilizerKg - 521.739) < 0.01);
});

test('rejects invalid input', () => {
  assert.throws(() => fertilizerQuantity({ area: 0, unit: 'acre', nutrientRateKgPerHa: 10, nutrientPercent: 46 }));
});
