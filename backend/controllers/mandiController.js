import { asyncHandler } from '../utils/asyncHandler.js';
import { getPrices, locate, stateNames } from '../services/mandiService.js';
import { ApiError } from '../utils/ApiError.js';

export const states = (req, res) => res.json({ success: true, data: stateNames() });

export const prices = asyncHandler(async (req, res) => {
  const { state, commodity, district, market } = req.query;
  if (!state || typeof state !== 'string') throw new ApiError(422, 'Choose a state');
  const s = (v) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 80) : undefined);
  res.json({ success: true, data: await getPrices({ state, commodity: s(commodity), district: s(district), market: s(market) }) });
});

export const where = asyncHandler(async (req, res) => {
  const lat = Number(req.query.lat), lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new ApiError(422, 'Latitude and longitude are needed');
  res.json({ success: true, data: await locate(lat, lon) });
});
