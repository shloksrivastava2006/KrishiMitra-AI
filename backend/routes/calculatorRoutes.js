import { Router } from 'express';
import { area, fertilizer, fertilizerPlan, fertilizerPlans, land, landUnits } from '../controllers/calculatorController.js';
import { listSeedRates, calculateSeed } from '../controllers/seedController.js';

// Pure calculations with no stored data, so these are public.
const router = Router();
router.post('/area', area);
router.post('/fertilizer', fertilizer);
router.get('/fertilizer-plans', fertilizerPlans);
router.post('/fertilizer-plan', fertilizerPlan);
router.get('/land-units', landUnits);
router.post('/land', land);
router.get('/seed-rates', listSeedRates);
router.post('/seed', calculateSeed);
export default router;
