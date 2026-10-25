import { Crop } from '../models/Crop.js';
import { Farm } from '../models/Farm.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const FIELDS = ['farm', 'name', 'variety', 'area', 'sowingDate', 'expectedHarvestDate', 'growthStage',
  'irrigationSchedule', 'fertilizerSchedule', 'notes'];
const pick = (body) => Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

const assertFarmOwned = async (farmId, userId) => {
  if (!(await Farm.exists({ _id: farmId, owner: userId }))) throw new ApiError(404, 'Farm not found');
};

const findOwned = async (id, userId) => {
  const crop = await Crop.findOne({ _id: id, owner: userId });
  if (!crop) throw new ApiError(404, 'Crop not found');
  return crop;
};

export const listCrops = asyncHandler(async (req, res) => {
  const filter = { owner: req.user._id };
  if (req.query.farm) filter.farm = req.query.farm;
  if (req.query.stage) filter.growthStage = String(req.query.stage);
  if (req.query.q) filter.name = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const crops = await Crop.find(filter).populate('farm', 'name').sort({ sowingDate: -1 });
  res.json({ success: true, data: crops });
});

export const createCrop = asyncHandler(async (req, res) => {
  await assertFarmOwned(req.body.farm, req.user._id);
  const crop = await Crop.create({ ...pick(req.body), owner: req.user._id });
  res.status(201).json({ success: true, data: crop });
});

export const getCrop = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await findOwned(req.params.id, req.user._id) });
});

export const updateCrop = asyncHandler(async (req, res) => {
  const crop = await findOwned(req.params.id, req.user._id);
  if (req.body.farm) await assertFarmOwned(req.body.farm, req.user._id);
  crop.set(pick(req.body));
  await crop.save();
  res.json({ success: true, data: crop });
});

export const deleteCrop = asyncHandler(async (req, res) => {
  const crop = await findOwned(req.params.id, req.user._id);
  await crop.deleteOne();
  res.json({ success: true, message: 'Crop removed' });
});
