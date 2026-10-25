import test from 'node:test';
import assert from 'node:assert/strict';
import { cropCard, daysUntil, harvestProgress, stageBreakdown } from '../../services/dashboardService.js';

const day = 24 * 60 * 60 * 1000;
const now = new Date('2026-10-16T10:00:00');

test('harvest progress is the share of time between sowing and harvest, clamped to 0..100', () => {
  const crop = { sowingDate: new Date(now.getTime() - 50 * day), expectedHarvestDate: new Date(now.getTime() + 50 * day) };
  assert.equal(harvestProgress(crop, now), 50);
  assert.equal(harvestProgress({ ...crop, expectedHarvestDate: new Date(now.getTime() - day) }, now), 100);
  assert.equal(harvestProgress({ ...crop, sowingDate: new Date(now.getTime() + 10 * day) }, now), 0);
});

test('progress is unknown (null) without a usable harvest date, never a guess', () => {
  assert.equal(harvestProgress({ sowingDate: now }, now), null);
  assert.equal(harvestProgress({ sowingDate: now, expectedHarvestDate: now }, now), null);
});

test('daysUntil counts calendar days and ignores past dates', () => {
  assert.equal(daysUntil(new Date('2026-10-16T23:00:00'), now), 0);
  assert.equal(daysUntil(new Date('2026-10-17T01:00:00'), now), 1);
  assert.equal(daysUntil(new Date('2026-10-26T00:00:00'), now), 10);
  assert.equal(daysUntil(new Date('2026-10-15T12:00:00'), now), null);
  assert.equal(daysUntil(undefined, now), null);
});

test('stage breakdown is in growing order and leaves out empty stages', () => {
  const crops = [{ growthStage: 'flowering' }, { growthStage: 'sowing' }, { growthStage: 'flowering' }];
  assert.deepEqual(stageBreakdown(crops), [{ stage: 'sowing', count: 1 }, { stage: 'flowering', count: 2 }]);
  assert.deepEqual(stageBreakdown([]), []);
});

test('crop card carries the farm name and omits empty optional fields', () => {
  const card = cropCard({ _id: 'c1', name: 'Wheat', farm: { name: 'North plot' }, growthStage: 'sowing', area: 2, sowingDate: now }, now);
  assert.equal(card.farmName, 'North plot');
  assert.equal(card.variety, undefined);
  assert.equal(card.progress, null);
});
