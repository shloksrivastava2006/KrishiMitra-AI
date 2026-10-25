import { ApiError } from '../utils/ApiError.js';
import { CROPS } from '../data/cropSuitability.js';
import { GUIDE } from '../data/cropGuide.js';

export const SEASONS = ['kharif', 'rabi', 'zaid'];
export const SOILS = ['alluvial', 'black', 'red', 'laterite', 'sandy', 'loamy', 'clay', 'unknown'];
export const WATER_LEVELS = ['low', 'medium', 'high'];
const RANK = { low: 0, medium: 1, high: 2 };

export const seasonOfMonth = (m) => (m >= 6 && m <= 9 ? 'kharif' : m >= 3 && m <= 5 ? 'zaid' : 'rabi');

// Rule-based shortlist. A crop is kept only if it fits the sowing time, the soil (when the soil is known) and the water the farmer has.
// Sowing time is either a season, or a calendar month (1-12) which uses each crop's own sowing months (data/cropGuide.js).
// season "any" with no month means every time of year. Soil "good" scores 2, "ok" 1; a crop whose water need equals the
// farmer's supply scores 1 more. Same score: alphabetical by id.
// No yield or profit is predicted; this only says which crops are commonly grown under those conditions.
export function recommend({ season, soil = 'unknown', water, month }) {
  const m = month === undefined || month === '' || month === null ? null : Number(month);
  if (m !== null && !(Number.isInteger(m) && m >= 1 && m <= 12)) throw new ApiError(422, 'Choose a month from 1 to 12');
  if (m === null && season !== 'any' && !SEASONS.includes(season)) throw new ApiError(422, 'Choose a season: kharif, rabi or zaid');
  if (!SOILS.includes(soil)) throw new ApiError(422, 'Choose a soil type or "not sure"');
  if (!WATER_LEVELS.includes(water)) throw new ApiError(422, 'Choose how much water you have: low, medium or high');

  const out = [];
  for (const c of CROPS) {
    const g = GUIDE[c.id];
    if (m !== null) { if (!g.sow.includes(m)) continue; }
    else if (season !== 'any' && !c.seasons.includes(season)) continue;
    let soilFit = 'unknown';
    if (soil !== 'unknown') {
      if (c.soil.good.includes(soil)) soilFit = 'good';
      else if (c.soil.ok.includes(soil)) soilFit = 'ok';
      else continue;
    }
    if (RANK[c.water] > RANK[water]) continue;
    const waterFit = c.water === water ? 'match' : 'below';
    out.push({
      id: c.id, image: c.image, seasons: c.seasons, water: c.water, days: c.days, soilFit, waterFit,
      score: (soilFit === 'good' ? 2 : soilFit === 'ok' ? 1 : 0) + (waterFit === 'match' ? 1 : 0),
      category: g.category, soilGood: c.soil.good, soilOk: c.soil.ok,
      sow: g.sow, harvest: g.harvest,
      guide: { land: g.land, sowing: g.sowing, water: g.water, feed: g.feed, yield: g.yield },
    });
  }
  return out.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
