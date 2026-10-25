import { Product, publicProduct } from '../models/Product.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { LICENCE_REQUIRED, buildListFilter, isProduce, rupeesToPaise } from '../services/marketRules.js';
import { Review } from '../models/Review.js';

const FIELDS = ['name', 'category', 'subcategory', 'description', 'unit', 'stock', 'district', 'state', 'licenceNumber', 'discountPercent', 'minOrderQty', 'deliveryAvailable', 'deliveryLocation', 'images', 'variety', 'harvestDate', 'grade', 'organic', 'village'];

const fromBody = (b) => {
  const data = Object.fromEntries(FIELDS.filter((f) => b[f] !== undefined).map((f) => [f, b[f]]));
  data.pricePaise = rupeesToPaise(b.price);
  if (!isProduce(data.category)) { for (const f of ['variety', 'harvestDate', 'grade', 'organic', 'village']) delete data[f]; }   // produce details only make sense for produce
  if (data.harvestDate === '') data.harvestDate = undefined;
  if (data.grade === '') data.grade = undefined;
  if (LICENCE_REQUIRED.includes(data.category) && !String(data.licenceNumber || '').trim()) {
    throw new ApiError(422, 'Seeds, fertilizers and bio-pesticides need your licence or registration number');
  }
  return data;
};

const sellerInfo = async (ids) => {
  const users = await User.find({ _id: { $in: ids } }).select('name role payout.upiId payout.accountLast4 seller.upiId seller.bankAccountLast4');
  return new Map(users.map((u) => [String(u._id), { name: u.name.split(' ')[0], role: u.role, user: u }]));
};

export const listProducts = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1; const limit = 12;
  const filter = buildListFilter(req.query);
  const blockedSellers = await User.find({ isActive: false }).distinct('_id');   // a blocked seller's listings disappear from the shop
  if (blockedSellers.length) filter.seller = { $nin: blockedSellers };
  const [items, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);
  const sellers = await sellerInfo(items.map((p) => p.seller));
  res.json({ success: true, data: { products: items.map((p) => { const s = sellers.get(String(p.seller)); return publicProduct(p, s?.name, s?.user); }), page, pages: Math.max(1, Math.ceil(total / limit)), total } });
});

export const getProduct = asyncHandler(async (req, res) => {
  const p = await Product.findOne({ _id: req.params.id, status: 'approved' });
  if (!p || !(await User.exists({ _id: p.seller, isActive: true }))) throw new ApiError(404, 'Product not found');
  const s = (await sellerInfo([p.seller])).get(String(p.seller));
  res.json({ success: true, data: publicProduct(p, s?.name, s?.user) });
});

// An approved listing with no stock left is shown as out_of_stock so the seller sees it at a glance.
const mineShape = (p, seller) => ({ ...publicProduct(p, undefined, seller), status: p.status === 'approved' && p.stock === 0 ? 'out_of_stock' : p.status, rejectionReason: p.rejectionReason, updatedAt: p.updatedAt });

export const myProducts = asyncHandler(async (req, res) => {
  const items = await Product.find({ seller: req.user._id, status: { $ne: 'archived' } }).sort({ createdAt: -1 });
  res.json({ success: true, data: items.map((p) => mineShape(p, req.user)) });
});

export const createProduct = asyncHandler(async (req, res) => {
  const p = await Product.create({ ...fromBody(req.body), seller: req.user._id, status: 'pending' });
  res.status(201).json({ success: true, data: mineShape(p, req.user) });
});

// Price and stock changes keep an approved listing live. Changing what the product IS sends it back for review.
export const updateProduct = asyncHandler(async (req, res) => {
  const p = await Product.findOne({ _id: req.params.id, seller: req.user._id, status: { $ne: 'archived' } });
  if (!p) throw new ApiError(404, 'Product not found');
  const next = fromBody(req.body);
  const identityChanged = ['name', 'category', 'subcategory', 'description', 'licenceNumber', 'variety'].some((f) => String(next[f] ?? '') !== String(p[f] ?? ''))
    || (next.organic !== undefined && Boolean(next.organic) !== Boolean(p.organic))   // an organic claim is re-checked
    || (next.images && JSON.stringify(next.images) !== JSON.stringify(p.images));
  p.set(next);
  // Changing what the product IS sends it back to review. A paused (inactive) listing stays paused.
  if (identityChanged && p.status !== 'inactive') { p.status = 'pending'; p.rejectionReason = undefined; }
  if (identityChanged && p.status === 'inactive') p.approvedAt = undefined;
  await p.save();
  res.json({ success: true, data: mineShape(p, req.user) });
});

// Archive, never delete: past orders keep pointing at the record.
export const archiveProduct = asyncHandler(async (req, res) => {
  const p = await Product.findOneAndUpdate({ _id: req.params.id, seller: req.user._id, status: { $ne: 'archived' } }, { status: 'archived' });
  if (!p) throw new ApiError(404, 'Product not found');
  res.json({ success: true, message: 'Listing removed' });
});

// Quick price / stock / pause switches from the seller's product table. These never need a new review.
export const quickUpdate = asyncHandler(async (req, res) => {
  const p = await Product.findOne({ _id: req.params.id, seller: req.user._id, status: { $in: ['approved', 'inactive', 'pending', 'rejected'] } });
  if (!p) throw new ApiError(404, 'Product not found');
  if (req.body.price !== undefined) p.pricePaise = rupeesToPaise(req.body.price);
  if (req.body.stock !== undefined) p.stock = req.body.stock;
  if (req.body.active === false) {
    if (p.status !== 'approved') throw new ApiError(409, 'Only a live listing can be paused');
    p.status = 'inactive'; p.approvedAt ??= new Date();
  } else if (req.body.active === true) {
    if (p.status !== 'inactive') throw new ApiError(409, 'This listing is not paused');
    if (!p.approvedAt) throw new ApiError(409, 'This listing needs admin approval first');
    p.status = 'approved';
  }
  await p.save();
  res.json({ success: true, data: mineShape(p, req.user) });
});

export const productReviews = asyncHandler(async (req, res) => {
  const p = await Product.findOne({ _id: req.params.id, status: 'approved' }).select('_id');
  if (!p) throw new ApiError(404, 'Product not found');
  const items = await Review.find({ product: p._id }).sort({ createdAt: -1 }).limit(50).populate('buyer', 'name');
  const avg = items.length ? items.reduce((s, r) => s + r.rating, 0) / items.length : 0;
  res.json({ success: true, data: { average: Math.round(avg * 10) / 10, count: items.length,
    reviews: items.map((r) => ({ id: r._id, rating: r.rating, comment: r.comment, buyerName: r.buyer?.name?.split(' ')[0], reply: r.reply?.text, createdAt: r.createdAt })) } });
});
