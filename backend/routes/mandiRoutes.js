import { Router } from 'express';
import { prices, states, where } from '../controllers/mandiController.js';

// Public: market prices are public data. The global /api rate limit applies, and results are cached for 30 minutes.
const router = Router();
router.get('/states', states);
router.get('/prices', prices);
router.get('/locate', where);
export default router;
