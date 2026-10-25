import mongoose from 'mongoose';

export const TASK_CATEGORIES = ['sowing', 'irrigation', 'fertilizer', 'spraying', 'weeding', 'harvest', 'other'];

// A reminder the farmer schedules for a farm job (sow, spray, irrigate, harvest...). Owner-scoped like every farmer record.
const farmTaskSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    crop: { type: String, trim: true, maxlength: 80, default: '' },
    category: { type: String, enum: TASK_CATEGORIES, default: 'other' },
    dueDate: { type: Date, required: true },
    notes: { type: String, trim: true, maxlength: 500 },
    done: { type: Boolean, default: false },
    doneAt: { type: Date },
  },
  { timestamps: true }
);
farmTaskSchema.index({ owner: 1, done: 1, dueDate: 1 });

export const FarmTask = mongoose.model('FarmTask', farmTaskSchema);
