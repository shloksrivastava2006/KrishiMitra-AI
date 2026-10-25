import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idRule } from '../validators/farmValidators.js';
import { orderRules, paymentVerifyRules, statusRules, trackingRules } from '../validators/marketValidators.js';
import { options, placeOrder, payInfo, verifyPayment, myOrders, sellingOrders, cancelMine, updateStatus, updateTracking } from '../controllers/orderController.js';

const router = Router();
router.use(protect);
router.post('/', authorize('farmer', 'vendor', 'customer'), orderRules, validate, placeOrder);
router.get('/options', options);
router.get('/mine', myOrders);
router.get('/selling', authorize('farmer', 'vendor'), sellingOrders);
router.get('/:id/pay', idRule, validate, payInfo);
router.post('/:id/verify-payment', idRule, paymentVerifyRules, validate, verifyPayment);
router.post('/:id/cancel', idRule, validate, cancelMine);
router.patch('/:id/status', authorize('farmer', 'vendor'), idRule, statusRules, validate, updateStatus);
router.patch('/:id/tracking', authorize('farmer', 'vendor'), idRule, trackingRules, validate, updateTracking);
export default router;
