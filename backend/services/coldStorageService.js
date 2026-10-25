// Cold storages near a place, from Google Places API (New) "Text Search".
// The API key is read from GOOGLE_PLACES_API_KEY in backend/.env and is never sent to the browser.
// Google gives name, address, phone and map link. It does NOT give storage capacity, rent per quintal or
// which crops a storage takes: the page says so and tells the farmer to phone and ask.
import { ApiError } from '../utils/ApiError.js';
import { matchState } from './mandiService.js';

const URL_SEARCH = 'https://places.googleapis.com/v1/places:searchText';
const FIELDS = ['places.id', 'places.displayName', 'places.formattedAddress', 'places.location', 'places.nationalPhoneNumber',
  'places.googleMapsUri', 'places.businessStatus', 'places.rating', 'places.userRatingCount'].join(',');
const TTL_MS = 30 * 60 * 1000; // short cache: saves quota and keeps results fresh
const cache = new Map();
export const clearColdStorageCache = () => cache.clear();

const norm = (s) => String(s ?? '').trim().toLowerCase();
const KEEP = /cold|storage|frost|freez|refriger|himghar|hima|chill/i;
const DROP = /packers|movers|self[\s-]?storage|ice\s?cream|restaurant|hotel/i;

export const isColdStorageName = (name) => KEEP.test(name || '') && !DROP.test(name || '');

/** Straight-line distance in km between two coordinates. */
export function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = (d) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export function normalizePlace(p, origin) {
  const lat = p.location?.latitude, lon = p.location?.longitude;
  const has = Number.isFinite(lat) && Number.isFinite(lon);
  const km = origin && has ? Math.round(distanceKm(origin.lat, origin.lon, lat, lon) * 10) / 10 : null;
  return {
    id: p.id, name: p.displayName?.text || '', address: p.formattedAddress || '', phone: p.nationalPhoneNumber || '',
    mapsUrl: p.googleMapsUri || '', lat: has ? lat : null, lon: has ? lon : null, distanceKm: km,
    rating: Number.isFinite(p.rating) ? p.rating : null, ratingCount: Number.isFinite(p.userRatingCount) ? p.userRatingCount : 0,
    closed: p.businessStatus === 'CLOSED_PERMANENTLY' || p.businessStatus === 'CLOSED_TEMPORARILY',
    closedForever: p.businessStatus === 'CLOSED_PERMANENTLY',
  };
}

export function buildQuery({ state, district, place }) {
  const where = [place, district, state].map((x) => (x || '').trim()).filter(Boolean).join(', ');
  return `cold storage in ${where}`;
}

/**
 * Search cold storages. Needs a state (or GPS coordinates). `district` and `place` (town, village, pincode) narrow it.
 * With lat/lon the results are biased to 50 km around the point and sorted nearest first.
 */
export async function searchColdStorages({ state, district, place, lat, lon }, fetchImpl = fetch) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new ApiError(503, 'Cold storage search is not set up yet. Add GOOGLE_PLACES_API_KEY to backend/.env');
  const st = state ? matchState(state) : null;
  if (state && !st) throw new ApiError(422, 'Choose a state from the list');
  const hasGps = Number.isFinite(lat) && Number.isFinite(lon);
  if (!st && !hasGps) throw new ApiError(422, 'Choose a state or use your location');
  if (hasGps && !(lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98)) throw new ApiError(422, 'This location is outside India');

  const textQuery = buildQuery({ state: st || '', district, place });
  const ck = `${norm(textQuery)}|${hasGps ? `${lat.toFixed(2)},${lon.toFixed(2)}` : ''}`;
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.out;

  const body = { textQuery, languageCode: 'en', regionCode: 'IN', pageSize: 20 };
  if (hasGps) body.locationBias = { circle: { center: { latitude: lat, longitude: lon }, radius: 50000 } };
  let res;
  try {
    res = await fetchImpl(URL_SEARCH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELDS },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
    });
  } catch { throw new ApiError(502, 'The cold storage search service (Google) is not reachable right now. Try again later'); }
  if (res.status === 400 || res.status === 403) throw new ApiError(503, 'Google rejected the cold storage API key. Check GOOGLE_PLACES_API_KEY and that Places API (New) is enabled for it');
  if (res.status === 429) throw new ApiError(503, 'The cold storage search limit has been reached for now. Try again later');
  if (!res.ok) throw new ApiError(502, 'The cold storage search service returned an error. Try again later');
  let json;
  try { json = await res.json(); } catch { throw new ApiError(502, 'The cold storage search service sent an unreadable answer. Try again later'); }

  const origin = hasGps ? { lat, lon } : null;
  const all = (Array.isArray(json.places) ? json.places : []).map((p) => normalizePlace(p, origin));
  const items = all.filter((p) => p.name && !p.closedForever && isColdStorageName(p.name));
  items.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9) || a.name.localeCompare(b.name));
  const out = {
    query: textQuery, state: st, district: district || null, count: items.length, hiddenCount: all.length - items.length,
    nearMe: hasGps, items,
    source: 'Google Maps (Places API). Listings are added by businesses and Google users, so the list may be incomplete or out of date',
    notListed: 'Capacity, rent and which crops a cold storage takes are not given. Phone the storage and ask before you send produce.',
  };
  cache.set(ck, { at: Date.now(), out });
  if (cache.size > 200) cache.delete(cache.keys().next().value);
  return out;
}
