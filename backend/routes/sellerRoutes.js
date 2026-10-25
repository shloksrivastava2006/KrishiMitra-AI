import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idRule } from '../validators/farmValidators.js';
import { replyRules } from '../validators/marketValidators.js';
import { summary, earnings, analytics, salesReport, myReviews, replyToReview } from '../controllers/sellerController.js';

// Seller-only (role 'vendor'), checked against the database on every request. Each handler also filters by req.user._id.
const router = Router();
router.use(protect, authorize('vendor'));
router.get('/summary', summary);
router.get('/earnings', earnings);
router.get('/analytics', analytics);
router.get('/reports/sales.csv', salesReport);
router.get('/reviews', myReviews);
router.post('/reviews/:id/reply', idRule, replyRules, validate, replyToReview);
export default router;
