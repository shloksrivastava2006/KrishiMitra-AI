import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { cropRules, idRule } from '../validators/farmValidators.js';
import { listCrops, createCrop, getCrop, updateCrop, deleteCrop } from '../controllers/cropController.js';

const router = Router();
router.use(protect, authorize('farmer'));
router.route('/').get(listCrops).post(cropRules, validate, createCrop);
router.route('/:id').get(idRule, validate, getCrop).put(idRule, cropRules, validate, updateCrop).delete(idRule, validate, deleteCrop);
export default router;
