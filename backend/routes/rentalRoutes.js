import { Router } from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idRule } from '../validators/farmValidators.js';
import { IMAGE_URL } from '../services/imageService.js';
import { EQUIPMENT_TYPES } from '../models/Rental.js';
import * as c from '../controllers/rentalController.js';

const router = Router();
const owner = [protect, authorize('vendor', 'farmer')];
const rules = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Enter the equipment name'),
  body('type').isIn(EQUIPMENT_TYPES).withMessage('Choose the equipment type'),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
  body('hourly').optional({ checkFalsy: true }).isFloat({ min: 1 }).withMessage('Enter a valid hourly rent'),
  body('daily').optional({ checkFalsy: true }).isFloat({ min: 1 }).withMessage('Enter a valid daily rent'),
  body('deposit').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Enter a valid deposit'),
  // The equipment stays at one fixed address; renters collect and return it there.
  body('address').trim().isLength({ min: 5, max: 200 }).withMessage('Enter the full pickup address (house, landmark, road)'),
  body('village').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  body('district').trim().isLength({ min: 2, max: 60 }).withMessage('Enter the district'),
  body('state').trim().isLength({ min: 2, max: 60 }).withMessage('Enter the state'),
  body('pincode').trim().matches(/^[1-9]\d{5}$/).withMessage('Enter a valid 6-digit PIN code'),
  body('upiId').optional({ checkFalsy: true }).trim().matches(/^[\w.\-]{2,40}@[a-zA-Z]{2,30}$/).withMessage('Enter a valid UPI ID, e.g. name@bank'),
  body('terms').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
  body('images').optional().isArray({ max: 5 }),
  body('images.*').matches(IMAGE_URL).withMessage('Invalid photo. Upload photos through the form'),
];
const bookRules = [
  body('start').isISO8601().withMessage('Choose a start time'), body('end').isISO8601().withMessage('Choose an end time'),
  body('rateType').isIn(['hour', 'day']).withMessage('Choose hourly or daily'), body('note').optional({ checkFalsy: true }).trim().isLength({ max: 300 }),
  body('paymentMethod').optional().isIn(['pay_at_pickup', 'online']).withMessage('Choose how you will pay'),
];

router.get('/', c.listPublic);                                              // public
router.get('/locations', c.locations);                                     // public: states and districts that have equipment
router.get('/mine/list', ...owner, c.mine);
router.get('/mine/bookings', ...owner, c.incoming);
router.patch('/bookings/:id/status', ...owner, idRule, body('status').isIn(['confirmed', 'rejected', 'handed_over', 'completed', 'cancelled']), validate, c.moveBooking);
router.get('/bookings/mine', protect, c.myBookings);
router.post('/bookings/:id/cancel', protect, idRule, validate, c.cancelBooking);
router.get('/bookings/:id/pay', protect, idRule, validate, c.payInfo);
router.post('/bookings/:id/verify-payment', protect, idRule,
  body('razorpay_order_id').isString().notEmpty(), body('razorpay_payment_id').isString().notEmpty(), body('razorpay_signature').isString().notEmpty(), validate, c.verifyPayment);
router.post('/', ...owner, rules, validate, c.create);
router.put('/:id', ...owner, idRule, rules, validate, c.update);
router.patch('/:id/active', ...owner, idRule, body('active').isBoolean().toBoolean(), validate, c.setActive);
router.delete('/:id', ...owner, idRule, validate, c.remove);
router.post('/:id/book', protect, authorize('farmer', 'vendor', 'customer'), idRule, bookRules, validate, c.requestBooking);
export default router;
