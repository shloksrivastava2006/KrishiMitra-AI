import test from 'node:test';
import assert from 'node:assert/strict';
import { advise } from '../../services/irrigationService.js';

const base = { crop: 'wheat', stage: 'vegetative', soil: 'loamy', method: 'drip', moisture: 55 };
const status = (code) => (e) => e.status === code;

test('moisture in the healthy band needs no water now and gives a next watering date', () => {
  const r = advise(base);
  assert.equal(r.status, 'optimal'); assert.equal(r.volumeMm, 0); assert.ok(r.nextDays >= 1);
});
test('dry soil gets a water volume, bigger when drier, capped by the method', () => {
  const a = advise({ ...base, moisture: 40 }); const b = advise({ ...base, moisture: 25, method: 'flood' }); const c = advise({ ...base, moisture: 5, method: 'flood' });
  assert.ok(a.volumeMm > 0 && ['irrigate', 'urgent'].includes(a.status));
  assert.equal(b.status, 'urgent');
  const sand = (moisture) => advise({ ...base, soil: 'sandy', method: 'flood', moisture }).volumeMm;   // light soil, so the cap is not reached yet
  assert.ok(sand(25) > sand(40));
  assert.ok(c.volumeMm <= 75);
});
test('clay holds water longer than sand so watering is needed less often', () => {
  assert.ok(advise({ ...base, soil: 'clay' }).nextDays > advise({ ...base, soil: 'sandy' }).nextDays);
});
test('too wet soil: skip irrigation. At maturity: stop irrigating. Rain-fed: no irrigation volume advice', () => {
  assert.equal(advise({ ...base, moisture: 90 }).status, 'too_wet');
  assert.equal(advise({ ...base, stage: 'maturity', moisture: 40 }).status, 'stop');
  assert.equal(advise({ ...base, method: 'rainfed', moisture: 20 }).status, 'rainfed_dry');
});
test('bad input is refused with 422', () => {
  assert.throws(() => advise({ ...base, crop: 'gold' }), status(422));
  assert.throws(() => advise({ ...base, moisture: 140 }), status(422));
  assert.throws(() => advise({ ...base, method: 'bucket' }), status(422));
});
