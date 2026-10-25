import { Farm } from '../models/Farm.js';
import { Crop } from '../models/Crop.js';
import { Product } from '../models/Product.js';
import { Notification } from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toSquareMetres } from '../services/calculatorService.js';
import { cropCard, daysUntil, farmCard, stageBreakdown } from '../services/dashboardService.js';

// Overview numbers come only from this user's own records; nothing is invented.
// Bigha farms are skipped in the acre total because their size is region dependent.
export const farmerOverview = asyncHandler(async (req, res) => {
  const [farms, crops, unreadNotifications, liveListings, pendingListings] = await Promise.all([
    Farm.find({ owner: req.user._id }).sort({ createdAt: 1 }),
    Crop.find({ owner: req.user._id }).populate('farm', 'name'),
    Notification.countDocuments({ user: req.user._id, read: false }),
    Product.countDocuments({ seller: req.user._id, status: 'approved' }),
    Product.countDocuments({ seller: req.user._id, status: 'pending' }),
  ]);

  const totalAcres = farms
    .filter((f) => f.unit !== 'bigha')
    .reduce((sum, f) => sum + toSquareMetres(f.area, f.unit) / 4046.8564224, 0);

  const active = crops.filter((c) => c.growthStage !== 'harvested');
  const distribution = Object.values(
    active.reduce((acc, c) => {
      acc[c.name] = acc[c.name] || { name: c.name, area: 0 };
      acc[c.name].area += c.area;
      return acc;
    }, {})
  );
  const upcomingHarvests = active
    .filter((c) => c.expectedHarvestDate && c.expectedHarvestDate > new Date())
    .sort((a, b) => a.expectedHarvestDate - b.expectedHarvestDate)
    .slice(0, 5);

  res.json({
    success: true,
    data: {
      farmCount: farms.length,
      totalAcres: Number(totalAcres.toFixed(2)),
      bighaFarmsExcluded: farms.some((f) => f.unit === 'bigha'),
      activeCropCount: active.length,
      distribution,
      upcomingHarvests,
      // Added for the farmer dashboard. The keys above are unchanged.
      nextHarvestInDays: upcomingHarvests.length ? daysUntil(upcomingHarvests[0].expectedHarvestDate) : null,
      stages: stageBreakdown(active),
      activeCrops: [...active].sort((a, b) => b.sowingDate - a.sowingDate).slice(0, 6).map((c) => cropCard(c)),
      farms: farms.slice(0, 6).map(farmCard),
      unreadNotifications,
      listings: { live: liveListings, pending: pendingListings },
    },
  });
});
