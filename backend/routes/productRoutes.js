import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idRule } from '../validators/farmValidators.js';
import { listRules, productRules, quickRules, reviewPostRules } from '../validators/marketValidators.js';
import { postReview } from '../controllers/reviewController.js';
import { listProducts, getProduct, myProducts, createProduct, updateProduct, archiveProduct, quickUpdate, productReviews } from '../controllers/productController.js';

const router = Router();
const seller = [protect, authorize('farmer', 'vendor')];
router.get('/', listRules, validate, listProducts);                       // public
router.get('/mine/list', ...seller, myProducts);                          // before '/:id'
router.post('/', ...seller, productRules, validate, createProduct);
router.get('/:id', idRule, validate, getProduct);                         // public, approved only
router.put('/:id', ...seller, idRule, productRules, validate, updateProduct);
router.delete('/:id', ...seller, idRule, validate, archiveProduct);
router.patch('/:id/quick', ...seller, idRule, quickRules, validate, quickUpdate);   // price, stock, pause/resume
router.get('/:id/reviews', idRule, validate, productReviews);                        // public
router.post('/:id/reviews', protect, idRule, reviewPostRules, validate, postReview); // buyers of a delivered order only
export default router;
