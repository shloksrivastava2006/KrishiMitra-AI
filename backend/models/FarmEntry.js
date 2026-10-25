import mongoose from 'mongoose';

export const ENTRY_TYPES = ['expense', 'income'];
export const EXPENSE_CATEGORIES = ['seed', 'fertilizer', 'pesticide', 'labour', 'irrigation', 'machinery', 'fuel', 'transport', 'land_rent', 'storage', 'other'];
export const INCOME_CATEGORIES = ['crop_sale', 'by_product', 'subsidy', 'other'];

// One line in a farmer's own money book: either money spent (expense) or money received (income).
// Profit and loss is never stored; it is worked out from these lines (services/ledgerService.js).
const farmEntrySchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    farm: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm' },
    crop: { type: String, trim: true, maxlength: 80, default: '' },   // crop name, free text; empty = general farm cost
    type: { type: String, enum: ENTRY_TYPES, required: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01, max: 1e9 },
    date: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);
farmEntrySchema.index({ owner: 1, date: -1 });

export const FarmEntry = mongoose.model('FarmEntry', farmEntrySchema);
