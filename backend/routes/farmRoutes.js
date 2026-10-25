import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { farmRules, idRule } from '../validators/farmValidators.js';
import { listFarms, createFarm, getFarm, updateFarm, deleteFarm } from '../controllers/farmController.js';

const router = Router();
router.use(protect, authorize('farmer'));
router.route('/').get(listFarms).post(farmRules, validate, createFarm);
router.route('/:id').get(idRule, validate, getFarm).put(idRule, farmRules, validate, updateFarm).delete(idRule, validate, deleteFarm);
export default router;
