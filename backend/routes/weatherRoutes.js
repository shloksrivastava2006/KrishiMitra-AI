import { Router } from 'express';
import { query } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { forecast, search } from '../controllers/weatherController.js';

// Public: weather is not private data. The global /api rate limit applies.
const router = Router();
router.get('/', [
  query('lat').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  query('lon').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
], validate, forecast);
router.get('/search', [query('q').trim().isLength({ min: 2, max: 60 }).withMessage('Enter at least 2 letters')], validate, search);
export default router;
