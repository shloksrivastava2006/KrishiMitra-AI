import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500 },
    reply: { text: { type: String, trim: true, maxlength: 500 }, at: Date },
  },
  { timestamps: true }
);
// One review per buyer per product, enforced by the database.
schema.index({ product: 1, buyer: 1 }, { unique: true });
export const Review = mongoose.model('Review', schema);
