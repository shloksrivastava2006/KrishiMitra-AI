import { Router } from 'express';
import { query } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { advise, STAGES, SOILS, METHODS } from '../services/irrigationService.js';
import { CROPS } from '../data/cropSuitability.js';

// Pure rule-based lookup with no stored data, so it is public (like the calculators and crop recommendation).
const router = Router();
router.get('/advice', [
  query('crop').isIn(CROPS.map((c) => c.id)).withMessage('Choose a crop from the list'),
  query('stage').isIn(STAGES).withMessage('Choose the growth stage'),
  query('soil').isIn(SOILS).withMessage('Choose the soil type'),
  query('method').isIn(METHODS).withMessage('Choose the irrigation setup'),
  query('moisture').isFloat({ min: 0, max: 100 }).withMessage('Soil moisture must be between 0 and 100'),
], validate, asyncHandler(async (req, res) => res.json({ success: true, data: advise(req.query) })));
export default router;
