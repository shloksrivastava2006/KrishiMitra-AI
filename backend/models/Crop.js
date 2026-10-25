import mongoose from 'mongoose';

export const GROWTH_STAGES = ['sowing', 'germination', 'vegetative', 'flowering', 'fruiting', 'harvest-ready', 'harvested'];

const cropSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    farm: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    variety: { type: String, trim: true },
    area: { type: Number, required: true, min: 0.01 },
    sowingDate: { type: Date, required: true },
    expectedHarvestDate: { type: Date },
    growthStage: { type: String, enum: GROWTH_STAGES, default: 'sowing' },
    irrigationSchedule: String,
    fertilizerSchedule: String,
    notes: { type: String, maxlength: 1000 },
    imageUrl: String,
  },
  { timestamps: true }
);

cropSchema.pre('validate', function checkDates(next) {
  if (this.expectedHarvestDate && this.sowingDate && this.expectedHarvestDate <= this.sowingDate) {
    this.invalidate('expectedHarvestDate', 'Harvest date must be after sowing date');
  }
  next();
});

export const Crop = mongoose.model('Crop', cropSchema);
