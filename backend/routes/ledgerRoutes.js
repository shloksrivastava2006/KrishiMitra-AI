import { Router } from 'express';
import { param } from 'express-validator';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { entryRules, filterRules } from '../validators/ledgerValidators.js';
import { categories, listEntries, createEntry, deleteEntry, profitLoss } from '../controllers/ledgerController.js';

// Farmer-only money book: expenses, income and the profit/loss worked out from them.
const router = Router();
router.use(protect, authorize('farmer'));
router.get('/categories', categories);
router.get('/profit-loss', filterRules, validate, profitLoss);
router.route('/').get(filterRules, validate, listEntries).post(entryRules, validate, createEntry);
router.delete('/:id', param('id').isMongoId().withMessage('Invalid id'), validate, deleteEntry);
export default router;
