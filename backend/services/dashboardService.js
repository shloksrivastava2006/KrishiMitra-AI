// Pure helpers for the farmer dashboard. No database access, so they can be unit tested on their own.
// Every number is computed from the farmer's own records; nothing is estimated or filled in.

export const STAGE_ORDER = ['sowing', 'germination', 'vegetative', 'flowering', 'fruiting', 'harvest-ready', 'harvested'];
const DAY_MS = 24 * 60 * 60 * 1000;

// Share of time elapsed between sowing and expected harvest (0 to 100).
// Null when there is no expected harvest date, because progress cannot be known without it.
export function harvestProgress(crop, now = new Date()) {
  if (!crop.expectedHarvestDate || !crop.sowingDate) return null;
  const start = new Date(crop.sowingDate).getTime();
  const end = new Date(crop.expectedHarvestDate).getTime();
  if (!(end > start)) return null;
  return Math.min(100, Math.max(0, Math.round(((now.getTime() - start) / (end - start)) * 100)));
}

// Whole days from today until the date (0 = today). Null for a missing or past date.
export function daysUntil(date, now = new Date()) {
  if (!date) return null;
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const diff = Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS);
  return diff < 0 ? null : diff;
}

// How many crops are in each growth stage, in growing order. Stages with no crops are left out.
export function stageBreakdown(crops) {
  const counts = new Map();
  for (const c of crops) counts.set(c.growthStage, (counts.get(c.growthStage) || 0) + 1);
  return STAGE_ORDER.filter((s) => counts.has(s)).map((stage) => ({ stage, count: counts.get(stage) }));
}

// Compact card data for the dashboard's "active crops" list.
export function cropCard(crop, now = new Date()) {
  return {
    _id: crop._id,
    name: crop.name,
    variety: crop.variety || undefined,
    farmName: crop.farm?.name || undefined,
    growthStage: crop.growthStage,
    area: crop.area,
    sowingDate: crop.sowingDate,
    expectedHarvestDate: crop.expectedHarvestDate || undefined,
    progress: harvestProgress(crop, now),
  };
}

// The farmer's own farm records, trimmed to what the dashboard shows.
export const farmCard = (f) => ({
  _id: f._id, name: f.name, location: f.location || undefined, area: f.area, unit: f.unit,
  soilType: f.soilType, irrigationMethod: f.irrigationMethod,
  latitude: f.latitude ?? undefined, longitude: f.longitude ?? undefined,
});
