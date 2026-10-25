import { body, query } from 'express-validator';
import { ENTRY_TYPES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../models/FarmEntry.js';

export const entryRules = [
  body('type').isIn(ENTRY_TYPES).withMessage('Choose expense or income'),
  body('category').custom((v, { req }) => (req.body.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).includes(v)).withMessage('Choose a valid category'),
  body('amount').isFloat({ gt: 0, max: 1e9 }).withMessage('Amount must be more than zero'),
  body('date').isISO8601().withMessage('Enter a valid date'),
  body('farm').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid farm'),
  body('crop').optional({ values: 'falsy' }).trim().isLength({ max: 80 }).withMessage('Crop name is too long'),
  body('note').optional({ values: 'falsy' }).trim().isLength({ max: 300 }).withMessage('Note is too long'),
];

export const filterRules = [
  query('farm').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid farm'),
  query('type').optional({ values: 'falsy' }).isIn(ENTRY_TYPES),
  query('from').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid start date'),
  query('to').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid end date'),
  query('crop').optional({ values: 'falsy' }).trim().isLength({ max: 80 }),
];
