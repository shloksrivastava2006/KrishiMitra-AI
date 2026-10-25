import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { summary } from '../controllers/customerController.js';

// Customer-only (role 'customer'), checked against the database on every request. The handler also filters by req.user._id.
const router = Router();
router.use(protect, authorize('customer'));
router.get('/summary', summary);
export default router;
