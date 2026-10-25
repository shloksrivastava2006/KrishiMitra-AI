import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { farmerOverview } from '../controllers/dashboardController.js';

const router = Router();
router.get('/farmer', protect, authorize('farmer'), farmerOverview);
export default router;
