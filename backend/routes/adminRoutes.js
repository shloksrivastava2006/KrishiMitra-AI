import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { adminCreateRules } from '../validators/authValidators.js';
import { idRule } from '../validators/farmValidators.js';
import { reviewRules } from '../validators/marketValidators.js';
import { body } from 'express-validator';
import { listSellers, reviewSeller, recordPayout, listRentals, blockRental, rentalMoney, rentalRefunded, revealPayout, overview, listUsers, createAdmin, setUserStatus, deleteUser, listProductsForReview, reviewProduct, listAllOrders } from '../controllers/adminController.js';

// Every admin endpoint checks the token AND the database role. Frontend guards are only for convenience.
const router = Router();
router.use(protect, authorize('admin'));
router.get('/overview', overview);
router.get('/users', listUsers);
router.post('/users', adminCreateRules, validate, createAdmin);
router.get('/users/:id/payout', idRule, validate, revealPayout);
router.patch('/users/:id/status', idRule, body('active').isBoolean().withMessage('Say whether the account should be active').toBoolean(), validate, setUserStatus);
router.delete('/users/:id', idRule, validate, deleteUser);
router.get('/products', listProductsForReview);
router.patch('/products/:id/review', idRule, reviewRules, validate, reviewProduct);
router.get('/orders', listAllOrders);
router.get('/sellers', listSellers);
router.patch('/sellers/:id/review', idRule, body('decision').isIn(['verify', 'reject', 'suspend', 'reinstate']), body('note').optional({ checkFalsy: true }).trim().isLength({ max: 300 }), validate, reviewSeller);
router.post('/sellers/:id/payouts', idRule, body('amount').isFloat({ min: 1, max: 10000000 }).withMessage('Enter the amount paid'),
  body('reference').trim().isLength({ min: 3, max: 80 }).withMessage('Enter the bank/UPI reference'), body('note').optional({ checkFalsy: true }).trim().isLength({ max: 200 }), validate, recordPayout);
router.get('/rentals', listRentals);
router.get('/rental-money', rentalMoney);
router.patch('/rental-bookings/:id/refunded', idRule, validate, rentalRefunded);
router.patch('/rentals/:id/block', idRule, body('blocked').isBoolean().toBoolean(), validate, blockRental);
export default router;
