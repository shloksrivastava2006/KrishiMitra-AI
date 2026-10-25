import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { analytics, salesReport } from '../controllers/sellerController.js';
import { earnings } from '../controllers/farmerController.js';

// Farmer-only, checked against the database on every request. Every handler filters by req.user._id, so a farmer only ever sees their own orders.
// Analytics and the CSV report are the same handlers sellers use: they read the signed-in user's own sold orders and nothing else.
const router = Router();
router.use(protect, authorize('farmer'));
router.get('/earnings', earnings);
router.get('/analytics', analytics);
router.get('/reports/sales.csv', salesReport);
export default router;
