// Live mandi prices from the Agmarknet feed on data.gov.in
// ("Current Daily Price of Various Commodities from Various Markets (Mandi)").
// The API key is read from DATA_GOV_API_KEY in backend/.env and is never sent to the browser.
import { ApiError } from '../utils/ApiError.js';

const BASE = 'https://api.data.gov.in/resource/';
export const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const TTL_MS = 30 * 60 * 1000; // the feed changes about once a day
const PAGE = 1000;
const MAX_PAGES = 4;
const cache = new Map();

// Agmarknet spells a few states differently from common usage; the first name that returns rows wins.
export const STATES = [
  ['Andhra Pradesh'], ['Arunachal Pradesh'], ['Assam'], ['Bihar'], ['Chhattisgarh', 'Chattisgarh'], ['Goa'], ['Gujarat'], ['Haryana'],
  ['Himachal Pradesh'], ['Jammu and Kashmir'], ['Jharkhand'], ['Karnataka'], ['Kerala'], ['Madhya Pradesh'], ['Maharashtra'], ['Manipur'],
  ['Meghalaya'], ['Mizoram'], ['Nagaland'], ['Odisha', 'Orissa'], ['Punjab'], ['Rajasthan'], ['Sikkim'], ['Tamil Nadu'], ['Telangana'],
  ['Tripura'], ['Uttar Pradesh'], ['Uttarakhand', 'Uttrakhand'], ['West Bengal'], ['NCT of Delhi', 'Delhi'], ['Puducherry', 'Pondicherry'],
  ['Chandigarh'], ['Ladakh'], ['Andaman and Nicobar'],
];
export const stateNames = () => STATES.map((s) => s[0]);
export const clearMandiCache = () => cache.clear();

const norm = (s) => String(s ?? '').trim().toLowerCase();
const price = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };
// arrival_date arrives as dd/mm/yyyy
const isoDate = (d) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(d || '')); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };

export const normalizeRecord = (r) => ({
  state: r.state, district: r.district, market: r.market, commodity: r.commodity, variety: r.variety || '', grade: r.grade || '',
  date: isoDate(r.arrival_date), min: price(r.min_price), max: price(r.max_price), modal: price(r.modal_price),
});

async function getPage(key, params) {
  const url = `${BASE}${RESOURCE_ID}?${new URLSearchParams({ 'api-key': key, format: 'json', ...params })}`;
  let res;
  try { res = await fetch(url, { signal: AbortSignal.timeout(15000) }); }
  catch { throw new ApiError(502, 'The mandi price service (data.gov.in) is not reachable right now. Try again later'); }
  if (res.status === 401 || res.status === 403) throw new ApiError(503, 'The mandi price API key was rejected by data.gov.in. Check DATA_GOV_API_KEY');
  if (!res.ok) throw new ApiError(502, 'The mandi price service returned an error. Try again later');
  let body;
  try { body = await res.json(); } catch { throw new ApiError(502, 'The mandi price service sent an unreadable answer. Try again later'); }
  if (body.error || body.status === 'error') throw new ApiError(502, 'The mandi price service returned an error. Try again later');
  return Array.isArray(body.records) ? body.records : [];
}

async function fetchState(key, stateNameVariants, commodity) {
  for (const stateName of stateNameVariants) {
    const filters = { 'filters[state.keyword]': stateName };
    if (commodity) filters['filters[commodity]'] = commodity;
    const all = [];
    for (let p = 0; p < MAX_PAGES; p += 1) {
      const rows = await getPage(key, { limit: String(PAGE), offset: String(p * PAGE), ...filters });
      all.push(...rows);
      if (rows.length < PAGE) break;
    }
    if (all.length) return all;
  }
  return [];
}

/** Prices for one state, optionally narrowed by commodity, district, market. */
export async function getPrices({ state, commodity, district, market }) {
  const key = process.env.DATA_GOV_API_KEY;
  if (!key) throw new ApiError(503, 'Live mandi prices are not set up yet. Add DATA_GOV_API_KEY to backend/.env');
  const variants = STATES.find((s) => norm(s[0]) === norm(state));
  if (!variants) throw new ApiError(422, 'Choose a state from the list');

  const ck = `${variants[0]}|${norm(commodity)}`;
  let hit = cache.get(ck);
  if (!hit || Date.now() - hit.at > TTL_MS) {
    const rows = (await fetchState(key, variants, commodity ? commodity.trim() : '')).map(normalizeRecord).filter((r) => r.modal || r.min || r.max);
    hit = { at: Date.now(), rows };
    cache.set(ck, hit);
    if (cache.size > 200) cache.delete(cache.keys().next().value);
  }

  const rows = hit.rows;
  const uniq = (list) => [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const byDistrict = district ? rows.filter((r) => norm(r.district) === norm(district)) : rows;
  const options = {
    districts: uniq(rows.map((r) => r.district)),
    commodities: uniq(byDistrict.map((r) => r.commodity)),
    markets: uniq(byDistrict.map((r) => r.market)),
  };
  let out = byDistrict;
  if (market) out = out.filter((r) => norm(r.market) === norm(market));
  out = [...out].sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.market.localeCompare(b.market) || a.commodity.localeCompare(b.commodity));
  const dates = out.map((r) => r.date).filter(Boolean).sort();
  return {
    state: variants[0], count: out.length, latestDate: dates.at(-1) || null, fetchedAt: new Date(hit.at).toISOString(),
    options, records: out.slice(0, 500), truncated: out.length > 500,
    unit: 'Rs per quintal (100 kg)',
    source: 'Agmarknet, Directorate of Marketing and Inspection, via data.gov.in (Open Government Data)',
  };
}

// ---- Location: turn GPS coordinates into the state and district names used by the mandi feed ----
// Uses OpenStreetMap Nominatim (no key; their policy needs an identifying User-Agent and at most 1 request a second, so results are cached).
const GEO_URL = 'https://nominatim.openstreetmap.org/reverse';
const geoCache = new Map();
const ALIASES = { 'delhi': 'NCT of Delhi', 'nct of delhi': 'NCT of Delhi', 'national capital territory of delhi': 'NCT of Delhi', 'orissa': 'Odisha', 'uttrakhand': 'Uttarakhand',
  'chattisgarh': 'Chhattisgarh', 'pondicherry': 'Puducherry', 'jammu & kashmir': 'Jammu and Kashmir', 'andaman & nicobar islands': 'Andaman and Nicobar',
  'andaman and nicobar islands': 'Andaman and Nicobar', 'andaman & nicobar': 'Andaman and Nicobar' };
/** Map any common spelling of a state to the name this app uses, or null. */
export function matchState(name) {
  const n = norm(name).replace(/\s+/g, ' ');
  if (!n) return null;
  if (ALIASES[n]) return ALIASES[n];
  const hit = STATES.find((v) => v.some((x) => norm(x) === n));
  return hit ? hit[0] : null;
}
export async function locate(lat, lon) {
  if (!(lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98)) throw new ApiError(422, 'This location is outside India');
  const ck = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  if (geoCache.has(ck)) return geoCache.get(ck);
  let res;
  try {
    res = await fetch(`${GEO_URL}?${new URLSearchParams({ format: 'jsonv2', lat: String(lat), lon: String(lon), zoom: '10', addressdetails: '1', 'accept-language': 'en' })}`,
      { headers: { 'User-Agent': 'KrishiMitraAI/1.0 (mandi price location lookup)' }, signal: AbortSignal.timeout(8000) });
  } catch { throw new ApiError(502, 'Could not find your place right now. Choose your state yourself'); }
  if (!res.ok) throw new ApiError(502, 'Could not find your place right now. Choose your state yourself');
  const a = (await res.json()).address || {};
  const state = matchState(a.state || a.union_territory || a.region);
  if (!state) throw new ApiError(404, 'Could not tell your state from this location. Choose it yourself');
  const district = String(a.state_district || a.county || a.district || '').replace(/\s+district$/i, '').trim() || null;
  const out = { state, district };
  geoCache.set(ck, out);
  if (geoCache.size > 500) geoCache.delete(geoCache.keys().next().value);
  return out;
}
