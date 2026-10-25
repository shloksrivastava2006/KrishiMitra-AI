import { asyncHandler } from '../utils/asyncHandler.js';
import { getForecast, searchPlaces } from '../services/weatherService.js';

export const forecast = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getForecast(Number(req.query.lat), Number(req.query.lon)) });
});

export const search = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await searchPlaces(req.query.q.trim()) });
});
