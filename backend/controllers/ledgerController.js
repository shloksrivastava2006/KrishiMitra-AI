import { FarmEntry, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../models/FarmEntry.js';
import { Farm } from '../models/Farm.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { summarize } from '../services/ledgerService.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Every query starts from owner = the signed-in farmer, so another farmer's lines can never be read or removed.
function filterFor(req) {
  const { farm, type, from, to, crop } = req.query;
  const f = { owner: req.user._id };
  if (farm) f.farm = farm;
  if (type) f.type = type;
  if (crop) f.crop = new RegExp(`^${escapeRegex(crop.trim())}$`, 'i');
  if (from || to) { f.date = {}; if (from) f.date.$gte = new Date(from); if (to) f.date.$lte = new Date(`${String(to).slice(0, 10)}T23:59:59.999Z`); }
  return f;
}

export const categories = (req, res) => res.json({ success: true, data: { expense: EXPENSE_CATEGORIES, income: INCOME_CATEGORIES } });

export const listEntries = asyncHandler(async (req, res) => {
  const entries = await FarmEntry.find(filterFor(req)).sort({ date: -1, createdAt: -1 }).limit(1000).populate('farm', 'name');
  res.json({ success: true, data: entries });
});

export const createEntry = asyncHandler(async (req, res) => {
  const { type, category, amount, date, farm, crop, note } = req.body;
  if (farm && !(await Farm.exists({ _id: farm, owner: req.user._id }))) throw new ApiError(404, 'Farm not found');
  const entry = await FarmEntry.create({ owner: req.user._id, type, category, amount: Number(amount), date, farm: farm || undefined, crop: crop || '', note });
  res.status(201).json({ success: true, data: entry });
});

export const deleteEntry = asyncHandler(async (req, res) => {
  const gone = await FarmEntry.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!gone) throw new ApiError(404, 'Entry not found');
  res.json({ success: true, message: 'Entry deleted' });
});

export const profitLoss = asyncHandler(async (req, res) => {
  const entries = await FarmEntry.find(filterFor(req)).select('type amount category crop').lean();
  res.json({ success: true, data: summarize(entries) });
});
