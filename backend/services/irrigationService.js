import { ApiError } from '../utils/ApiError.js';
import { CROPS } from '../data/cropSuitability.js';

// Rule-based irrigation advice. GENERAL guidance, not a measured water balance: it does not know your rainfall, temperature or
// root depth. The numbers below are rounded rules of thumb; confirm with your KVK / irrigation department.
export const STAGES = ['germination', 'vegetative', 'flowering', 'fruiting', 'maturity'];
export const SOILS = ['sandy', 'loamy', 'clay', 'black', 'red', 'alluvial'];
export const METHODS = ['flood', 'sprinkler', 'drip', 'rainfed'];

const CROP_NEED = { low: 0.7, medium: 1, high: 1.4 };
const STAGE = {                       // lowest healthy moisture % for the stage, and how fast the soil dries relative to normal
  germination: { floor: 55, dry: 0.7 }, vegetative: { floor: 45, dry: 0.9 }, flowering: { floor: 55, dry: 1.1 },
  fruiting: { floor: 50, dry: 1.0 }, maturity: { floor: 25, dry: 0.6 },
};
const SOIL = { sandy: { mm: 1.0, dry: 1.4 }, red: { mm: 1.2, dry: 1.2 }, loamy: { mm: 1.5, dry: 1.0 }, alluvial: { mm: 1.5, dry: 1.0 }, black: { mm: 1.9, dry: 0.75 }, clay: { mm: 2.0, dry: 0.7 } };
const METHOD = { flood: { eff: 0.6, cap: 75 }, sprinkler: { eff: 0.75, cap: 45 }, drip: { eff: 0.9, cap: 20 }, rainfed: { eff: 0.6, cap: 50 } };
const TARGET = 70;                    // refill to about 70 percent
const WET = 80;                       // above this the soil is too wet

export function advise({ crop, stage, soil, method, moisture }) {
  const c = CROPS.find((x) => x.id === crop);
  if (!c) throw new ApiError(422, 'Choose a crop from the list');
  if (!STAGES.includes(stage)) throw new ApiError(422, 'Choose the growth stage');
  if (!SOILS.includes(soil)) throw new ApiError(422, 'Choose the soil type');
  if (!METHODS.includes(method)) throw new ApiError(422, 'Choose the irrigation setup');
  const m = Number(moisture);
  if (!Number.isFinite(m) || m < 0 || m > 100) throw new ApiError(422, 'Soil moisture must be between 0 and 100');

  const s = STAGE[stage]; const so = SOIL[soil]; const me = METHOD[method];
  const floor = s.floor;
  const dryPerDay = Math.max(0.5, 3 * CROP_NEED[c.water] * s.dry * so.dry);   // moisture points lost per day
  let status; let volumeMm = 0; let nextDays;

  if (m > WET) { status = 'too_wet'; nextDays = Math.ceil((m - floor) / dryPerDay); }
  else if (m >= floor) { status = 'optimal'; nextDays = Math.max(1, Math.floor((m - floor) / dryPerDay)); }
  else {
    status = m < floor - 15 ? 'urgent' : 'irrigate';
    volumeMm = Math.min(me.cap, Math.round(((TARGET - m) * so.mm) / me.eff / 5) * 5);
    nextDays = Math.max(1, Math.floor((TARGET - floor) / dryPerDay));
  }
  if (method === 'rainfed' && (status === 'irrigate' || status === 'urgent')) status = 'rainfed_dry';
  if (stage === 'maturity' && status !== 'too_wet') { status = m < floor ? 'stop_dry' : 'stop'; volumeMm = 0; }

  const timing = method === 'sprinkler' ? 'Early morning (6:00 to 9:00 AM), when wind is low' : method === 'drip' ? 'Early morning (6:00 to 8:30 AM)' : 'Early morning or evening (after 5:00 PM)';
  return { crop, water: c.water, stage, soil, method, moisture: m, floor, status, volumeMm, nextDays, timing, targetMoisture: TARGET };
}
