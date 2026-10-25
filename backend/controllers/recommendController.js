import { asyncHandler } from '../utils/asyncHandler.js';
import { recommend } from '../services/recommendService.js';

export const recommendCrops = asyncHandler(async (req, res) => {
  const { season, soil, water, month } = req.query;
  res.json({ success: true, data: { season, month: month ? Number(month) : undefined, soil: soil || 'unknown', water, crops: recommend({ season, soil, water, month }) } });
});
