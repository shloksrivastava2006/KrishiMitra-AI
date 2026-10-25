import { Router } from 'express';
import { body, param } from 'express-validator';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { TASK_CATEGORIES } from '../models/FarmTask.js';
import { listTasks, createTask, setDone, deleteTask } from '../controllers/taskController.js';

const router = Router();
const id = param('id').isMongoId().withMessage('Invalid id');
router.use(protect, authorize('farmer'));
router.route('/').get(listTasks).post([
  body('title').trim().isLength({ min: 2, max: 120 }).withMessage('Describe the task (2 to 120 letters)'),
  body('crop').optional({ values: 'falsy' }).trim().isLength({ max: 80 }),
  body('category').optional({ values: 'falsy' }).isIn(TASK_CATEGORIES).withMessage('Choose a valid category'),
  body('dueDate').isISO8601().withMessage('Enter a valid date'),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Notes are too long'),
], validate, createTask);
router.patch('/:id', id, body('done').optional().isBoolean(), validate, setDone);
router.delete('/:id', id, validate, deleteTask);
export default router;
