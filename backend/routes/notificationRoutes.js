import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idRule } from '../validators/farmValidators.js';
import { list, markRead, markAllRead } from '../controllers/notificationController.js';

const router = Router();
router.use(protect);
router.get('/', list);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', idRule, validate, markRead);
export default router;
