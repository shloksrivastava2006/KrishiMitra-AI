import { asyncHandler } from '../utils/asyncHandler.js';
import { seedRequirement } from '../services/calculatorService.js';
import { SEED_CROPS, SEED_RATES } from '../data/seedRates.js';
import { ApiError } from '../utils/ApiError.js';

// Empty string / missing -> undefined; anything else -> Number (NaN is caught by the service checks).
const num = (v) => (v === undefined || v === null || v === '' ? undefined : Number(v));

export const listSeedRates = (req, res) => res.json({ success: true, data: { crops: SEED_CROPS, rates: SEED_RATES } });

export const calculateSeed = asyncHandler(async (req, res) => {
  const b = req.body;
  if (!(num(b.area) > 0)) throw new ApiError(422, 'Enter a land area greater than zero');
  const data = seedRequirement({
    area: num(b.area), unit: b.unit, bighaSqm: num(b.bighaSqm),
    rate: num(b.rate), rateUnit: b.rateUnit,
    assumedGermination: num(b.assumedGermination), actualGermination: num(b.actualGermination),
    bagSizeKg: num(b.bagSizeKg),
  });
  res.json({ success: true, data });
});
