import { Review } from '../models/Review.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notify } from '../services/notify.js';
import { User } from '../models/User.js';
import { sellerLink } from '../services/marketRules.js';

// Only someone whose order containing this product was DELIVERED can review it, once. Ratings cannot be edited or faked.
export const postReview = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).select('seller name status');
  if (!product || product.status === 'archived') throw new ApiError(404, 'Product not found');
  const order = await Order.findOne({ buyer: req.user._id, status: 'delivered', 'lines.product': product._id }).select('_id');
  if (!order) throw new ApiError(403, 'You can review a product after your order has been delivered');
  if (await Review.exists({ product: product._id, buyer: req.user._id })) throw new ApiError(409, 'You have already reviewed this product');
  await Review.create({ product: product._id, seller: product.seller, buyer: req.user._id, order: order._id, rating: req.body.rating, comment: req.body.comment });
  notify(product.seller, 'review', 'New review', `${req.body.rating}/5 for ${product.name}`, sellerLink((await User.findById(product.seller).select('role'))?.role, '/seller/reviews', '/my-sales'));
  res.status(201).json({ success: true, message: 'Thank you for your review' });
});
