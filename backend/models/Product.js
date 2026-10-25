import mongoose from 'mongoose';
import { CATEGORIES, UNITS, GRADES, PRODUCT_STATUSES, MAX_IMAGES, isProduce, codOnlyForRole, salePaiseOf } from '../services/marketRules.js';

const schema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    subcategory: { type: String, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 1000 },
    images: { type: [String], default: [], validate: (v) => v.length <= MAX_IMAGES },
    // pricePaise is the list price. salePaise is what buyers pay (list price minus discount) and is what orders use.
    pricePaise: { type: Number, required: true, min: 100, max: 100_000_000 },
    discountPercent: { type: Number, default: 0, min: 0, max: 90 },
    salePaise: { type: Number, min: 100 },
    unit: { type: String, enum: UNITS, default: 'kg' },
    stock: { type: Number, required: true, min: 0, max: 1_000_000 },
    minOrderQty: { type: Number, default: 1, min: 1, max: 1000 },
    deliveryAvailable: { type: Boolean, default: true },
    deliveryLocation: { type: String, trim: true, maxlength: 200 },
    // Farm-produce details (all optional; used by the "Sell my produce" page)
    variety: { type: String, trim: true, maxlength: 60 },
    harvestDate: Date,   // harvested on, or expected harvest date
    grade: { type: String, enum: GRADES },
    organic: { type: Boolean, default: false },
    village: { type: String, trim: true, maxlength: 80 },
    district: { type: String, trim: true, maxlength: 60 },
    state: { type: String, trim: true, maxlength: 60 },
    licenceNumber: { type: String, trim: true, maxlength: 60 },
    status: { type: String, enum: PRODUCT_STATUSES, default: 'pending', index: true },
    approvedAt: Date,   // set when an admin approves; lets a seller re-activate a paused listing without a second review
    rejectionReason: { type: String, maxlength: 300 },
  },
  { timestamps: true }
);

schema.pre('validate', function setSalePrice(next) {
  if (this.pricePaise != null) this.salePaise = salePaiseOf(this.pricePaise, this.discountPercent);
  next();
});

export const Product = mongoose.model('Product', schema);

// Public view: never exposes the seller's email or phone.
export const publicProduct = (p, sellerName, sellerRole) => ({
  id: p._id, name: p.name, category: p.category, subcategory: p.subcategory, description: p.description, images: p.images || [],
  sellerId: p.seller, price: (p.salePaise ?? p.pricePaise) / 100, listPrice: p.pricePaise / 100, discountPercent: p.discountPercent || 0,
  unit: p.unit, stock: p.stock, minOrderQty: p.minOrderQty || 1, deliveryAvailable: p.deliveryAvailable !== false, deliveryLocation: p.deliveryLocation,
  district: p.district, state: p.state, licenceNumber: p.licenceNumber, sellerName: sellerName || undefined, createdAt: p.createdAt,
  isProduce: isProduce(p.category), variety: p.variety, harvestDate: p.harvestDate, grade: p.grade, organic: Boolean(p.organic), village: p.village,
  codOnly: codOnlyForRole(sellerRole),   // farmers are paid directly; see ONLINE_PAYMENT_SELLER_ROLES
});
