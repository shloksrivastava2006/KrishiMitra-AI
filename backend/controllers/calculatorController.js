import { asyncHandler } from '../utils/asyncHandler.js';
import { convertArea, fertilizerQuantity } from '../services/calculatorService.js';
import { convertLand, listLandStates } from '../services/landService.js';
import { listPlans, planRequirement } from '../services/fertilizerPlanService.js';
import { ApiError } from '../utils/ApiError.js';

const num = (v) => (v === undefined || v === '' ? undefined : Number(v));

export const area = asyncHandler(async (req, res) => {
  res.json({ success: true, data: convertArea({ value: num(req.body.value), unit: req.body.unit, bighaSqm: num(req.body.bighaSqm) }) });
});

export const landUnits = (req, res) => res.json({ success: true, data: listLandStates() });

export const land = asyncHandler(async (req, res) => {
  res.json({ success: true, data: convertLand({ state: req.body.state, unit: req.body.unit, value: num(req.body.value) }) });
});

export const fertilizer = asyncHandler(async (req, res) => {
  const { area: a, unit, bighaSqm, nutrientRateKgPerHa, nutrientPercent } = req.body;
  const data = fertilizerQuantity({
    area: num(a), unit, bighaSqm: num(bighaSqm),
    nutrientRateKgPerHa: num(nutrientRateKgPerHa), nutrientPercent: num(nutrientPercent),
  });
  res.json({
    success: true,
    data,
    note: 'Quantity is based on the application rate you entered. It is not an agronomic recommendation; confirm rates with a soil test or your local agriculture office.',
  });
});

// Crop-wise, state-wise fertilizer schedule from the ICAR advisories: how much, when, and the water schedule.
export const fertilizerPlans = (req, res) => res.json({ success: true, data: listPlans() });

export const fertilizerPlan = asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.planId || typeof b.planId !== 'string') throw new ApiError(422, 'Choose a crop and a state');
  if (!(num(b.area) > 0)) throw new ApiError(422, 'Enter a land area greater than zero');
  const data = planRequirement({
    planId: b.planId, area: num(b.area), unit: b.unit, bighaSqm: num(b.bighaSqm),
    pSource: b.pSource || 'DAP', baseDate: b.baseDate, bagSizeKg: num(b.bagSizeKg) ?? 50,
  });
  res.json({
    success: true,
    data,
    note: 'The doses and days come from the ICAR advisory named in the result, for that state and season. They are not a recommendation for your field: confirm with a soil test or your local KVK / agriculture office.',
  });
});
