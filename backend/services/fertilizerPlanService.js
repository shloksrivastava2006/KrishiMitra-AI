import { ApiError } from '../utils/ApiError.js';
import { toSquareMetres } from './calculatorService.js';
import { FERT_CROPS, FERT_GRADES, FERT_PLANS } from '../data/fertilizerPlans.js';

const SQM_PER_HA = 10000;
const NAMES = {
  urea: 'Urea (46% N)', DAP: 'DAP (18-46-0)', SSP: 'SSP (16% P2O5)', MOP: 'MOP / muriate of potash (60% K2O)',
  ZnSO4: 'Zinc sulphate', gypsum: 'Gypsum',
};
const BAGGED = new Set(['urea', 'DAP', 'SSP', 'MOP']);
const PRODUCT_KEYS = ['urea', 'DAP', 'SSP', 'MOP', 'ZnSO4', 'gypsum'];
const BASE_TEXT = { sowing: 'sowing', transplanting: 'transplanting', planting: 'planting', emergence: 'emergence of the shoots' };
const lo = (v) => (Array.isArray(v) ? v[0] : v);
const hi = (v) => (Array.isArray(v) ? v[1] : v);
const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

export const listPlans = () => ({
  crops: FERT_CROPS,
  // Light list: the steps are returned by the calculation, which keeps this response small.
  plans: FERT_PLANS.map(({ steps, water, ...meta }) => ({ ...meta, hasFertilizer: steps.length > 0, hasWater: water.length > 0 })),
});

export const getPlan = (id) => {
  const p = FERT_PLANS.find((x) => x.id === id);
  if (!p) throw new ApiError(404, 'That fertilizer plan was not found. Choose the crop and state again');
  return p;
};

/**
 * One bound (low or high) of one plan, in kg PER HECTARE of each fertilizer, step by step.
 * Nutrient plans: P2O5 -> DAP (18% N, 46% P2O5) or SSP (16% P2O5); K2O -> MOP (60%); N -> urea (46%).
 * The nitrogen that comes with DAP is counted: it is taken off the next nitrogen that the plan asks for,
 * so the farmer does not over-apply N.  Product plans are used exactly as the advisory names the fertilizers.
 */
function perHectare(plan, pSource, pick) {
  let credit = 0; // kg N per ha already supplied by DAP and not yet subtracted
  const steps = plan.steps.map((s) => {
    const a = s.apply;
    const fert = {};
    const nutrients = {};
    const n = pick(a.N) || 0, p = pick(a.P2O5) || 0, k = pick(a.K2O) || 0, sul = pick(a.S) || 0;
    if (plan.basis === 'nutrient') {
      if (p > 0) {
        if (pSource === 'DAP') { const dap = p / (FERT_GRADES.DAP.P2O5 / 100); fert.DAP = dap; credit += dap * (FERT_GRADES.DAP.N / 100); }
        else fert.SSP = p / (FERT_GRADES.SSP.P2O5 / 100);
      }
      if (n > 0 || credit > 0) {
        const need = Math.max(0, n - credit);
        credit = Math.max(0, credit - n);
        if (need > 0) fert.urea = need / (FERT_GRADES.urea.N / 100);
      }
      if (k > 0) fert.MOP = k / (FERT_GRADES.MOP.K2O / 100);
    }
    for (const key of PRODUCT_KEYS) if (a[key] !== undefined) fert[key] = (fert[key] || 0) + pick(a[key]);
    if (n) nutrients.N = n; if (p) nutrients.P2O5 = p; if (k) nutrients.K2O = k; if (sul) nutrients.S = sul;
    return { fert, nutrients };
  });
  return { steps, creditLeft: credit };
}

const addDays = (iso, days) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const dateRange = (baseDate, day) => (baseDate && day ? { from: addDays(baseDate, day.from), to: addDays(baseDate, day.to) } : null);

export function planRequirement({ planId, area, unit, bighaSqm, pSource = 'DAP', baseDate, bagSizeKg = 50 }) {
  const plan = getPlan(planId);
  if (!['DAP', 'SSP'].includes(pSource)) throw new ApiError(422, 'Phosphorus source must be DAP or SSP');
  if (baseDate !== undefined && baseDate !== null && baseDate !== '') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(baseDate) || Number.isNaN(Date.parse(`${baseDate}T00:00:00Z`))) throw new ApiError(422, 'Enter the date as year-month-day');
  } else baseDate = undefined;
  if (!(bagSizeKg > 0)) throw new ApiError(422, 'Bag size must be greater than zero');
  const areaHa = toSquareMetres(area, unit, bighaSqm) / SQM_PER_HA;

  const low = perHectare(plan, pSource, lo);
  const high = perHectare(plan, pSource, hi);
  // "Low" and "high" are the smaller and larger of the two bounds for each fertilizer (a phosphorus range can move urea the other way when DAP is used).
  const totA = {}, totB = {};
  const steps = plan.steps.map((s, i) => {
    const fertilizers = Object.keys({ ...low.steps[i].fert, ...high.steps[i].fert }).map((key) => {
      const a = (low.steps[i].fert[key] || 0) * areaHa, b = (high.steps[i].fert[key] || 0) * areaHa;
      totA[key] = (totA[key] || 0) + a; totB[key] = (totB[key] || 0) + b;
      return { key, name: NAMES[key], kgLow: round(Math.min(a, b)), kgHigh: round(Math.max(a, b)) };
    });
    const nutrientsKg = Object.fromEntries(Object.entries(s.apply).filter(([k]) => ['N', 'P2O5', 'K2O', 'S'].includes(k))
      .map(([k, v]) => [k, { low: round(lo(v) * areaHa), high: round(hi(v) * areaHa) }]));
    return { when: s.when, note: s.note, day: s.day, dates: dateRange(baseDate, s.day), fertilizers, nutrientsKg, foliar: Object.keys(s.apply).length === 0 };
  });

  const totals = Object.keys(totA).map((key) => {
    const mn = Math.min(totA[key], totB[key]), mx = Math.max(totA[key], totB[key]);
    const t = { key, name: NAMES[key], kgLow: round(mn), kgHigh: round(mx) };
    if (BAGGED.has(key)) { t.bagsLow = Math.ceil(mn / bagSizeKg - 1e-9); t.bagsHigh = Math.ceil(mx / bagSizeKg - 1e-9); }
    return t;
  });

  const water = plan.water.map((w) => {
    const out = { when: w.when, note: w.note, day: w.day, dates: dateRange(baseDate, w.day) };
    if (w.depthCm) { out.depthCm = w.depthCm; out.litres = Math.round((w.depthCm / 100) * areaHa * SQM_PER_HA * 1000); }
    return out;
  });

  const notes = [];
  if (plan.basis === 'nutrient' && pSource === 'DAP' && low.creditLeft > 0) notes.push('DAP gives more nitrogen than this plan asks for, so no urea is needed for the rest of it.');
  if (plan.basis === 'product') notes.push('This advisory names the fertilizers and gives their quantities directly, so they are used as printed (the DAP/SSP choice does not apply).');
  if (plan.note) notes.push(plan.note);

  return {
    plan: { id: plan.id, crop: plan.crop, state: plan.state, season: plan.season, doc: plan.doc, label: plan.label, pages: plan.pages, published: plan.published, basis: plan.basis, base: plan.base, baseText: BASE_TEXT[plan.base] },
    areaHectare: areaHa, pSource: plan.basis === 'nutrient' ? pSource : null, baseDate: baseDate || null,
    steps, totals, water, notes,
  };
}
