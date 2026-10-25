// Weather from Open-Meteo (no API key). Check their terms before commercial use: https://open-meteo.com/en/terms
import { ApiError } from '../utils/ApiError.js';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const TTL_MS = 10 * 60 * 1000;
const cache = new Map(); // key -> { at, value }

const remember = (key, value) => { cache.set(key, { at: Date.now(), value }); if (cache.size > 500) cache.delete(cache.keys().next().value); return value; };
const recall = (key) => { const hit = cache.get(key); return hit && Date.now() - hit.at < TTL_MS ? hit.value : null; };
export const clearWeatherCache = () => cache.clear();

async function getJson(url) {
  let res;
  try { res = await fetch(url, { signal: AbortSignal.timeout(8000) }); }
  catch { throw new ApiError(502, 'Weather service is not reachable right now. Try again later'); }
  if (!res.ok) throw new ApiError(502, 'Weather service returned an error. Try again later');
  return res.json();
}

export const buildForecastUrl = (lat, lon) => `${FORECAST_URL}?${new URLSearchParams({
  latitude: String(lat), longitude: String(lon), timezone: 'auto', forecast_days: '7',
  current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
  daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration',
})}`;

// Rule-based, deliberately simple, and not crop specific. Thresholds are general rules of thumb, not agronomy research.
export function irrigationAdvice(daily) {
  const next = (daily || []).slice(0, 3);
  if (next.length === 0) return { level: 'unknown', reasons: [] };
  const rain2 = next.slice(0, 2).reduce((s, d) => s + (d.rainMm || 0), 0);
  const maxProb2 = Math.max(...next.slice(0, 2).map((d) => d.rainChance ?? 0));
  const rain3 = next.reduce((s, d) => s + (d.rainMm || 0), 0);
  const et = next.map((d) => d.et0Mm).filter((v) => typeof v === 'number');
  const avgEt = et.length ? et.reduce((s, v) => s + v, 0) / et.length : null;

  if (maxProb2 >= 60 || rain2 >= 5) return { level: 'hold', reasons: [{ code: 'rainSoon', rainMm: Number(rain2.toFixed(1)), chance: maxProb2 }] };
  if (rain3 < 2 && avgEt !== null && avgEt >= 5) return { level: 'likely', reasons: [{ code: 'dryHot', rainMm: Number(rain3.toFixed(1)), et0: Number(avgEt.toFixed(1)) }] };
  return { level: 'normal', reasons: [{ code: 'normal', rainMm: Number(rain3.toFixed(1)) }] };
}

export function shapeForecast(raw, lat, lon) {
  const c = raw.current || {};
  const d = raw.daily || {};
  const daily = (d.time || []).map((date, i) => ({
    date, code: d.weather_code?.[i], maxC: d.temperature_2m_max?.[i], minC: d.temperature_2m_min?.[i],
    rainMm: d.precipitation_sum?.[i], rainChance: d.precipitation_probability_max?.[i], et0Mm: d.et0_fao_evapotranspiration?.[i],
  }));
  return {
    source: 'Open-Meteo', latitude: lat, longitude: lon, timezone: raw.timezone,
    current: { tempC: c.temperature_2m, feelsC: c.apparent_temperature, humidity: c.relative_humidity_2m, rainMm: c.precipitation, windKmh: c.wind_speed_10m, code: c.weather_code, time: c.time },
    daily, irrigation: irrigationAdvice(daily),
  };
}

export async function getForecast(lat, lon) {
  // Round to ~1 km so nearby requests share a cache entry and exact positions are not kept.
  const rlat = Number(lat.toFixed(2)); const rlon = Number(lon.toFixed(2));
  const key = `f:${rlat},${rlon}`;
  return recall(key) || remember(key, shapeForecast(await getJson(buildForecastUrl(rlat, rlon)), rlat, rlon));
}

export async function searchPlaces(query) {
  const key = `g:${query.toLowerCase()}`;
  const hit = recall(key);
  if (hit) return hit;
  const raw = await getJson(`${GEOCODE_URL}?${new URLSearchParams({ name: query, count: '6', language: 'en', countryCode: 'IN' })}`);
  const places = (raw.results || []).map((r) => ({ name: r.name, district: r.admin2, state: r.admin1, latitude: r.latitude, longitude: r.longitude }));
  return remember(key, places);
}
