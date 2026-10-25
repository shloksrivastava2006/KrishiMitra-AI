import test from 'node:test';
import assert from 'node:assert/strict';
import { listPlans, planRequirement } from '../../services/fertilizerPlanService.js';
import { FERT_CROPS, FERT_PLANS } from '../../data/fertilizerPlans.js';

const close = (a, b, tol = 0.15) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);
const fert = (step, key) => step.fertilizers.find((f) => f.key === key)?.kgLow ?? 0;
const total = (r, key) => r.totals.find((t) => t.key === key)?.kgLow ?? 0;

test('Haryana wheat with SSP matches the quantities printed in the advisory (325 kg urea, 375 kg SSP, 50 kg MOP per ha)', () => {
  const r = planRequirement({ planId: 'wheat-haryana-irr', area: 1, unit: 'hectare', pSource: 'SSP' });
  close(total(r, 'urea'), 326.1);   // 150 kg N / 0.46; the advisory rounds it to 325 kg
  close(total(r, 'SSP'), 375);
  close(total(r, 'MOP'), 50);
  assert.equal(r.steps.length, 2);
  close(fert(r.steps[0], 'urea'), 163.0);
  close(fert(r.steps[1], 'urea'), 163.0);
});

test('with DAP the nitrogen it carries is taken off the urea', () => {
  const r = planRequirement({ planId: 'wheat-haryana-irr', area: 1, unit: 'hectare', pSource: 'DAP' });
  close(total(r, 'DAP'), 130.4);                       // 60 / 0.46
  const nFromDap = 130.43 * 0.18;                      // 23.5 kg N
  close(total(r, 'urea'), (150 - nFromDap) / 0.46, 0.3);
  close(fert(r.steps[1], 'urea'), 75 / 0.46, 0.2);     // the 2nd step is untouched
});

test('product plans are used as printed and scale with area (Punjab happy-seeder: 65 kg DAP per acre)', () => {
  const r = planRequirement({ planId: 'wheat-punjab-hs', area: 1, unit: 'acre' });
  close(fert(r.steps[0], 'DAP'), 65, 0.2);
  close(fert(r.steps[1], 'urea'), 40, 0.2);
  const two = planRequirement({ planId: 'wheat-punjab-hs', area: 2, unit: 'acre' });
  close(fert(two.steps[0], 'DAP'), 130, 0.3);
  assert.equal(r.pSource, null);
});

test('ranges give a low and a high figure (Bihar wheat second N dose 60-70 kg/ha)', () => {
  const r = planRequirement({ planId: 'wheat-bihar-timely', area: 1, unit: 'hectare', pSource: 'SSP' });
  const urea = r.steps[1].fertilizers.find((f) => f.key === 'urea');
  close(urea.kgLow, 60 / 0.46); close(urea.kgHigh, 70 / 0.46);
});

test('step dates follow the base date (Haryana: first irrigation 21-22 days after sowing)', () => {
  const r = planRequirement({ planId: 'wheat-haryana-irr', area: 1, unit: 'hectare', baseDate: '2026-11-10' });
  assert.deepEqual(r.steps[0].dates, null);
  assert.deepEqual(r.steps[1].dates, { from: '2026-12-01', to: '2026-12-02' });
  assert.deepEqual(r.water[0].dates, { from: '2026-12-01', to: '2026-12-02' });
});

test('water depth becomes litres (Assam wheat: 6 cm on 1 ha = 600 m3)', () => {
  const r = planRequirement({ planId: 'wheat-assam', area: 1, unit: 'hectare' });
  assert.equal(r.steps.length, 0);
  assert.equal(r.water[0].litres, 600000);
});

test('kanal-based advisories are converted with the Land calculator value (0.0506 ha)', () => {
  const r = planRequirement({ planId: 'wheat-jk-kashmir', area: 1, unit: 'hectare' });
  close(fert(r.steps[0], 'urea'), 4 / 0.0506, 0.2);
});

test('bags are rounded up', () => {
  const r = planRequirement({ planId: 'wheat-haryana-irr', area: 1, unit: 'hectare', pSource: 'SSP', bagSizeKg: 50 });
  assert.equal(r.totals.find((t) => t.key === 'urea').bagsLow, 7); // 326.1 kg
});

test('rejects bad input', () => {
  assert.throws(() => planRequirement({ planId: 'nope', area: 1, unit: 'acre' }), /not found/);
  assert.throws(() => planRequirement({ planId: 'wheat-haryana-irr', area: 0, unit: 'acre' }), /greater than zero/);
  assert.throws(() => planRequirement({ planId: 'wheat-haryana-irr', area: 1, unit: 'acre', baseDate: '10/11/2026' }), /year-month-day/);
  assert.throws(() => planRequirement({ planId: 'wheat-haryana-irr', area: 1, unit: 'acre', pSource: 'TSP' }), /DAP or SSP/);
  assert.throws(() => planRequirement({ planId: 'wheat-haryana-irr', area: 1, unit: 'bigha' }), /Bigha size varies/);
});

test('every plan in the data file is sourced and well formed', () => {
  const cropIds = new Set(FERT_CROPS.map((c) => c.id));
  const ids = new Set();
  for (const p of FERT_PLANS) {
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`); ids.add(p.id);
    assert.ok(cropIds.has(p.crop), `${p.id}: unknown crop`);
    assert.ok(p.state && p.label && p.published, `${p.id}: missing text`);
    assert.ok(p.pages.length > 0 && p.pages.every((n) => n > 0 && n < 800), `${p.id}: bad pages`);
    assert.ok(/Kharif Agro-Advisories|Rabi Agro-Advisory/.test(p.doc), `${p.id}: bad source`);
    assert.ok(['sowing', 'transplanting', 'planting', 'emergence'].includes(p.base), `${p.id}: bad base`);
    assert.ok(p.steps.length + p.water.length > 0, `${p.id}: empty plan`);
    for (const s of [...p.steps, ...p.water]) {
      assert.ok(s.when, `${p.id}: step without text`);
      if (s.day) assert.ok(s.day.from >= 0 && s.day.from <= s.day.to, `${p.id}: bad days`);
    }
    for (const s of p.steps) {
      for (const [k, v] of Object.entries(s.apply)) {
        assert.ok(['N', 'P2O5', 'K2O', 'S', 'urea', 'DAP', 'SSP', 'MOP', 'ZnSO4', 'gypsum'].includes(k), `${p.id}: unknown nutrient ${k}`);
        const [a, b] = Array.isArray(v) ? v : [v, v];
        assert.ok(a > 0 && b >= a, `${p.id}: bad dose for ${k}`);
        if (['urea', 'DAP', 'SSP', 'MOP'].includes(k)) assert.equal(p.basis, 'product', `${p.id}: product dose in a nutrient plan`);
        if (['N', 'P2O5', 'K2O'].includes(k)) assert.equal(p.basis, 'nutrient', `${p.id}: nutrient dose in a product plan`);
      }
    }
  }
});

test('every plan can be calculated with both phosphorus sources', () => {
  for (const p of FERT_PLANS) for (const pSource of ['DAP', 'SSP']) {
    const r = planRequirement({ planId: p.id, area: 1.5, unit: 'acre', pSource, baseDate: '2026-11-01' });
    for (const t of r.totals) assert.ok(t.kgLow >= 0 && t.kgHigh >= t.kgLow, `${p.id}: bad total for ${t.key}`);
  }
  assert.ok(listPlans().plans.length === FERT_PLANS.length);
});
