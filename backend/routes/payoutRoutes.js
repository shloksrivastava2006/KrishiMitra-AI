import { Router } from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getPayout, removePayout, savePayout } from '../controllers/payoutController.js';

const router = Router();
// Farmers only. Sellers (vendors) add the same details in their seller profile.
router.use(protect, authorize('farmer'));

const rules = [
  body('upiId').optional({ checkFalsy: true }).trim().matches(/^[\w.\-]{2,40}@[a-zA-Z]{2,30}$/).withMessage('Enter a valid UPI ID, e.g. name@bank'),
  body('accountName').optional({ checkFalsy: true }).trim().matches(/^[\p{L} .'\-]{2,80}$/u).withMessage('Enter the account holder name as it is in the bank'),
  body('accountNumber').optional({ checkFalsy: true }).trim().matches(/^\d{9,18}$/).withMessage('Bank account number must be 9 to 18 digits'),
  body('ifsc').optional({ checkFalsy: true }).trim().matches(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/).withMessage('Enter a valid IFSC code'),
];

router.get('/', getPayout);
router.put('/', rules, validate, savePayout);
router.delete('/', removePayout);
export default router;
