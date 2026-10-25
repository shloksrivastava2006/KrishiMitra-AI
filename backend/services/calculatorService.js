import { ApiError } from '../utils/ApiError.js';

const SQM_PER = { sqm: 1, sqft: 0.09290304, acre: 4046.8564224, hectare: 10000 };

// Bigha differs by state (and even district), so the caller MUST supply its size in square metres.
export function toSquareMetres(value, unit, bighaSqm) {
  if (!(value > 0)) throw new ApiError(422, 'Area must be greater than zero');
  if (unit === 'bigha') {
    if (!(bighaSqm > 0)) throw new ApiError(422, 'Bigha size varies by region. Enter the local bigha size in square metres');
    return value * bighaSqm;
  }
  if (!SQM_PER[unit]) throw new ApiError(422, `Unsupported unit: ${unit}`);
  return value * SQM_PER[unit];
}

export function convertArea({ value, unit, bighaSqm }) {
  const sqm = toSquareMetres(value, unit, bighaSqm);
  const result = {
    sqm: sqm,
    sqft: sqm / SQM_PER.sqft,
    acre: sqm / SQM_PER.acre,
    hectare: sqm / SQM_PER.hectare,
  };
  if (bighaSqm > 0) result.bigha = sqm / bighaSqm;
  return result;
}

/**
 * Fertilizer quantity for a rate the farmer (or their agronomist) has chosen.
 *   fertilizerKg = nutrientRateKgPerHa * areaHa / (nutrientPercent / 100)
 * Example: 120 kg N/ha on 2 ha using urea (46% N) -> 120 * 2 / 0.46 = 521.7 kg
 * The rate is NOT an agronomic recommendation; it is exactly what the user typed.
 */
export function fertilizerQuantity({ area, unit, bighaSqm, nutrientRateKgPerHa, nutrientPercent }) {
  if (!(nutrientRateKgPerHa > 0)) throw new ApiError(422, 'Application rate must be greater than zero');
  if (!(nutrientPercent > 0 && nutrientPercent <= 100)) throw new ApiError(422, 'Nutrient content must be between 0 and 100 percent');
  const areaHa = toSquareMetres(area, unit, bighaSqm) / SQM_PER.hectare;
  const totalKg = (nutrientRateKgPerHa * areaHa) / (nutrientPercent / 100);
  return { areaHectare: areaHa, fertilizerKg: totalKg, fertilizerBags50kg: totalKg / 50 };
}

const HA_PER_ACRE = 0.404686;
const MAX_RATE_KG_PER_HA = 15000; // sanity limit to catch typing mistakes, not an agronomic value (sugarcane setts and potato tubers are quoted in tonnes per hectare)

/**
 * Seed Required (kg) = Land Area (ha) x Seed Rate (kg/ha)
 * Rates published per acre are converted: kg/ha = kg/acre / 0.404686.
 * Optional germination adjustment (only when BOTH numbers are given):
 *   adjusted = base x (germination the rate assumes / germination of your seed)
 * Bag count is rounded up so the farmer never buys too little.
 */
export function seedRequirement({ area, unit, bighaSqm, rate, rateUnit, assumedGermination, actualGermination, bagSizeKg }) {
  const areaHa = toSquareMetres(area, unit, bighaSqm) / SQM_PER.hectare;
  if (!(rate > 0)) throw new ApiError(422, 'Enter a seed rate greater than zero');
  if (!['kg/ha', 'kg/acre'].includes(rateUnit)) throw new ApiError(422, 'Seed rate unit must be kg/ha or kg/acre');
  const rateKgPerHa = rateUnit === 'kg/acre' ? rate / HA_PER_ACRE : rate;
  if (rateKgPerHa > MAX_RATE_KG_PER_HA) throw new ApiError(422, 'That seed rate looks too high. Check the number and unit');

  let factor = 1;
  const hasA = assumedGermination !== undefined && assumedGermination !== null;
  const hasB = actualGermination !== undefined && actualGermination !== null;
  if (hasA !== hasB) throw new ApiError(422, 'For a germination adjustment, enter both germination percentages');
  if (hasA) {
    for (const g of [assumedGermination, actualGermination]) {
      if (!(g > 0 && g <= 100)) throw new ApiError(422, 'Germination must be between 1 and 100 percent');
    }
    factor = assumedGermination / actualGermination;
  }

  const baseKg = areaHa * rateKgPerHa;
  const totalKg = baseKg * factor;
  const result = { areaHectare: areaHa, rateKgPerHa, baseSeedKg: baseKg, germinationFactor: factor, totalSeedKg: totalKg, totalQuintals: totalKg / 100 };
  if (bagSizeKg !== undefined && bagSizeKg !== null) {
    if (!(bagSizeKg > 0)) throw new ApiError(422, 'Bag size must be greater than zero');
    result.bagSizeKg = bagSizeKg;
    result.bags = Math.ceil(totalKg / bagSizeKg - 1e-9);
  }
  return result;
}
