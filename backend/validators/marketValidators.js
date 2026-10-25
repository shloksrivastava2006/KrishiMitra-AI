import { body, query } from 'express-validator';
import { CATEGORIES, UNITS, GRADES, MAX_IMAGES, harvestDateOk } from '../services/marketRules.js';
import { IMAGE_URL } from '../services/imageService.js';

export const productRules = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Enter a product name'),
  body('category').isIn(CATEGORIES).withMessage('Choose a category'),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Description is too long'),
  body('price').exists({ checkFalsy: true }).withMessage('Enter a price'),
  body('unit').isIn(UNITS).withMessage('Choose a unit'),
  body('stock').isInt({ min: 0, max: 1000000 }).withMessage('Stock must be a whole number'),
  body('district').optional({ checkFalsy: true }).trim().isLength({ max: 60 }),
  body('state').optional({ checkFalsy: true }).trim().isLength({ max: 60 }),
  body('licenceNumber').optional({ checkFalsy: true }).trim().isLength({ max: 60 }).withMessage('Licence number is too long'),
  body('variety').optional({ checkFalsy: true }).trim().isLength({ max: 60 }).withMessage('Variety is too long'),
  body('village').optional({ checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('Village name is too long'),
  body('grade').optional({ checkFalsy: true }).isIn(GRADES).withMessage('Choose grade A, B or C'),
  body('organic').optional().isBoolean().withMessage('Organic must be yes or no').toBoolean(),
  body('harvestDate').optional({ checkFalsy: true }).isISO8601({ strict: true }).withMessage('Enter a valid harvest date').bail().custom((v) => harvestDateOk(v)).withMessage('Harvest date must be within the last 60 days or the next 90 days'),
  body('subcategory').optional({ checkFalsy: true }).trim().isLength({ max: 60 }).withMessage('Subcategory is too long'),
  body('discountPercent').optional({ checkFalsy: true }).isFloat({ min: 0, max: 90 }).withMessage('Discount must be between 0 and 90 percent').toFloat(),
  body('minOrderQty').optional({ checkFalsy: true }).isInt({ min: 1, max: 1000 }).withMessage('Minimum order must be a whole number from 1 to 1000').toInt(),
  body('deliveryAvailable').optional().isBoolean().withMessage('Delivery must be yes or no').toBoolean(),
  body('deliveryLocation').optional({ checkFalsy: true }).trim().isLength({ max: 200 }).withMessage('Delivery location is too long'),
  // Only paths returned by our own upload endpoint are accepted, so a seller cannot point a listing at another website.
  body('images').optional().isArray({ max: MAX_IMAGES }).withMessage(`Add at most ${MAX_IMAGES} photos`),
  body('images.*').matches(IMAGE_URL).withMessage('Invalid photo. Upload photos through the form'),
];

export const quickRules = [
  body('price').optional().exists({ checkFalsy: true }),
  body('stock').optional().isInt({ min: 0, max: 1000000 }).withMessage('Stock must be a whole number').toInt(),
  body('active').optional().isBoolean().toBoolean(),
];

export const reviewPostRules = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Choose a rating from 1 to 5').toInt(),
  body('comment').optional({ checkFalsy: true }).trim().isLength({ max: 500 }).withMessage('Review is too long (500 characters at most)'),
];
export const replyRules = [body('text').trim().isLength({ min: 1, max: 500 }).withMessage('Write a reply (500 characters at most)')];

export const listRules = [
  query('category').optional().isIn(CATEGORIES),
  query('type').optional().isIn(['produce', 'inputs']),
  query('organic').optional().isBoolean(),
  query('district').optional().trim().isLength({ max: 60 }),
  query('q').optional().trim().isLength({ max: 60 }),
  query('page').optional().isInt({ min: 1, max: 1000 }),
];

export const orderRules = [
  body('items').isArray({ min: 1, max: 20 }).withMessage('Your cart is empty'),
  body('items.*.productId').isMongoId().withMessage('Invalid product'),
  body('items.*.qty').isInt({ min: 1, max: 1000 }).withMessage('Quantity must be a whole number from 1 to 1000'),
  body('paymentMethod').isIn(['cod', 'online']).withMessage('Choose how you will pay'),
  body('address.name').trim().isLength({ min: 2, max: 80 }).withMessage('Enter the receiver name'),
  body('address.phone').matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit mobile number'),
  body('address.line1').trim().isLength({ min: 3, max: 200 }).withMessage('Enter the delivery address'),
  body('address.village').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  body('address.district').trim().isLength({ min: 2, max: 80 }).withMessage('Enter the district'),
  body('address.state').trim().isLength({ min: 2, max: 80 }).withMessage('Enter the state'),
  body('address.pincode').matches(/^[1-9]\d{5}$/).withMessage('Enter a valid 6-digit pincode'),
];

export const paymentVerifyRules = [
  body('razorpay_order_id').isString().isLength({ min: 5, max: 60 }),
  body('razorpay_payment_id').isString().isLength({ min: 5, max: 60 }),
  body('razorpay_signature').isString().isLength({ min: 20, max: 200 }),
];

// Courier details are all optional; they matter only when marking an order shipped (or editing them afterwards).
export const trackingRules = [
  body('courier').optional({ checkFalsy: true }).trim().isLength({ max: 60 }).withMessage('Courier name is too long'),
  body('trackingNumber').optional({ checkFalsy: true }).trim().matches(/^[\w\-\/ ]{3,40}$/).withMessage('Tracking number: 3 to 40 letters, numbers or dashes'),
  body('expectedDelivery').optional({ checkFalsy: true }).isISO8601().withMessage('Enter a valid delivery date').toDate(),
  body('note').optional({ checkFalsy: true }).trim().isLength({ max: 200 }).withMessage('Note is too long (200 characters)'),
];
export const statusRules = [body('status').isIn(['confirmed', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status'), ...trackingRules];
export const reviewRules = [
  body('decision').isIn(['approve', 'reject']).withMessage('Choose approve or reject'),
  body('reason').optional({ checkFalsy: true }).trim().isLength({ max: 300 }),
];
