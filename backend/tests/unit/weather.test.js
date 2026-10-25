import test from 'node:test';
import assert from 'node:assert/strict';
import { irrigationAdvice, shapeForecast, buildForecastUrl, getForecast, clearWeatherCache } from '../../services/weatherService.js';

const day = (o) => ({ rainMm: 0, rainChance: 0, et0Mm: 3, ...o });

test('hold irrigation when rain is likely in the next 2 days', () => {
  assert.equal(irrigationAdvice([day({ rainChance: 70 }), day({}), day({})]).level, 'hold');
  assert.equal(irrigationAdvice([day({ rainMm: 3 }), day({ rainMm: 3 }), day({})]).level, 'hold');
});
test('irrigation likely when dry and high evapotranspiration', () => {
  assert.equal(irrigationAdvice([day({ et0Mm: 6 }), day({ et0Mm: 6 }), day({ et0Mm: 5 })]).level, 'likely');
});
test('normal otherwise; unknown with no data; rain on day 3 alone does not trigger hold', () => {
  assert.equal(irrigationAdvice([day({}), day({}), day({ rainMm: 20, rainChance: 90 })]).level, 'normal');
  assert.equal(irrigationAdvice([]).level, 'unknown');
});
test('forecast is reshaped from Open-Meteo arrays', () => {
  const raw = { timezone: 'Asia/Kolkata', current: { temperature_2m: 30, weather_code: 1 },
    daily: { time: ['2026-10-14'], weather_code: [61], temperature_2m_max: [33], temperature_2m_min: [22], precipitation_sum: [4], precipitation_probability_max: [55], et0_fao_evapotranspiration: [4.2] } };
  const f = shapeForecast(raw, 27.18, 78.02);
  assert.equal(f.daily[0].maxC, 33); assert.equal(f.daily[0].rainChance, 55); assert.equal(f.current.tempC, 30);
});
test('url carries coordinates; second identical request is served from cache', async () => {
  assert.match(buildForecastUrl(27.18, 78.02), /latitude=27\.18&longitude=78\.02/);
  clearWeatherCache();
  let calls = 0; const real = globalThis.fetch;
  globalThis.fetch = async () => { calls++; return { ok: true, json: async () => ({ timezone: 'x', current: {}, daily: { time: [] } }) }; };
  try { await getForecast(27.1801, 78.0199); await getForecast(27.18, 78.02); } finally { globalThis.fetch = real; }
  assert.equal(calls, 1);
});
test('network failure becomes a 502', async () => {
  clearWeatherCache(); const real = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('offline'); };
  try { await assert.rejects(getForecast(10, 10), (e) => e.status === 502); } finally { globalThis.fetch = real; }
});
