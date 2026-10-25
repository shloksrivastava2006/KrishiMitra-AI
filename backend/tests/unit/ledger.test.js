import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../../services/ledgerService.js';

const e = (type, amount, category, crop = '') => ({ type, amount, category, crop });

test('profit is income minus expense, with ROI on money spent', () => {
  const r = summarize([e('expense', 4000, 'seed', 'Wheat'), e('expense', 6000, 'labour', 'wheat'), e('income', 15000, 'crop_sale', 'Wheat ')]);
  assert.equal(r.expense, 10000); assert.equal(r.income, 15000); assert.equal(r.profit, 5000); assert.equal(r.roiPercent, 50);
  assert.equal(r.perCrop.length, 1);   // "Wheat", "wheat" and "Wheat " are one crop
});

test('a loss is negative and shown per crop, worst last', () => {
  const r = summarize([e('expense', 9000, 'fertilizer', 'Tomato'), e('income', 6000, 'crop_sale', 'Tomato'), e('expense', 2000, 'seed', 'Onion'), e('income', 5000, 'crop_sale', 'Onion')]);
  assert.equal(r.profit, 0);
  assert.deepEqual(r.perCrop.map((c) => [c.crop, c.profit]), [['Onion', 3000], ['Tomato', -3000]]);
});

test('spending by category adds up to 100 percent and general costs have their own row', () => {
  const r = summarize([e('expense', 750, 'seed'), e('expense', 250, 'labour', 'Rice')]);
  assert.deepEqual(r.byCategory.map((c) => [c.category, c.share]), [['seed', 75], ['labour', 25]]);
  assert.equal(r.perCrop.find((c) => c.crop === '').expense, 750);
});

test('no entries and no spending give zeros and no ROI, never NaN', () => {
  const r = summarize([]);
  assert.equal(r.profit, 0); assert.equal(r.roiPercent, null);
  assert.equal(summarize([e('income', 100, 'crop_sale')]).roiPercent, null);
});
