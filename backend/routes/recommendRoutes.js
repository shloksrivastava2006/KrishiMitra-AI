import { Router } from 'express';
import { query } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { recommendCrops } from '../controllers/recommendController.js';
import { SEASONS, SOILS, WATER_LEVELS } from '../services/recommendService.js';

// Pure rule-based lookup with no stored data, so it is public (like the calculators).
// Send either a month (1-12, uses each crop's own sowing months) or a season (kharif, rabi, zaid, or any).
const router = Router();
router.get('/', [
  query('month').optional({ values: 'falsy' }).isInt({ min: 1, max: 12 }).withMessage('Choose a month from 1 to 12'),
  query('season').custom((v, { req }) => Boolean(req.query.month) || [...SEASONS, 'any'].includes(v)).withMessage('Choose a season: kharif, rabi or zaid'),
  query('soil').optional().isIn(SOILS).withMessage('Choose a soil type or "not sure"'),
  query('water').isIn(WATER_LEVELS).withMessage('Choose how much water you have: low, medium or high'),
], validate, recommendCrops);
export default router;
