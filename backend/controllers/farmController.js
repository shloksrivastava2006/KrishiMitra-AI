import { Farm } from '../models/Farm.js';
import { Crop } from '../models/Crop.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const FIELDS = ['name', 'location', 'latitude', 'longitude', 'area', 'unit', 'soilType', 'irrigationMethod', 'waterSource', 'notes'];
const pick = (body) => Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

// Every query includes owner, so changing :id to someone else's farm returns 404, not their data.
const findOwned = async (id, userId) => {
  const farm = await Farm.findOne({ _id: id, owner: userId });
  if (!farm) throw new ApiError(404, 'Farm not found');
  return farm;
};

export const listFarms = asyncHandler(async (req, res) => {
  const farms = await Farm.find({ owner: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: farms });
});

export const createFarm = asyncHandler(async (req, res) => {
  const farm = await Farm.create({ ...pick(req.body), owner: req.user._id });
  res.status(201).json({ success: true, data: farm });
});

export const getFarm = asyncHandler(async (req, res) => {
  const farm = await findOwned(req.params.id, req.user._id);
  const crops = await Crop.find({ farm: farm._id, owner: req.user._id }).sort({ sowingDate: -1 });
  res.json({ success: true, data: { farm, crops } });
});

export const updateFarm = asyncHandler(async (req, res) => {
  const farm = await findOwned(req.params.id, req.user._id);
  farm.set(pick(req.body));
  await farm.save();
  res.json({ success: true, data: farm });
});

export const deleteFarm = asyncHandler(async (req, res) => {
  const farm = await findOwned(req.params.id, req.user._id);
  await Crop.deleteMany({ farm: farm._id, owner: req.user._id });
  await farm.deleteOne();
  res.json({ success: true, message: 'Farm and its crops were deleted' });
});
