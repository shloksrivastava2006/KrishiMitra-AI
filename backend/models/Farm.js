import mongoose from 'mongoose';

const farmSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    location: { type: String, trim: true },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    area: { type: Number, required: true, min: 0.01 },
    unit: { type: String, enum: ['acre', 'hectare', 'sqm', 'sqft', 'bigha'], default: 'acre' },
    soilType: { type: String, enum: ['alluvial', 'black', 'red', 'laterite', 'sandy', 'loamy', 'clay', 'other'], default: 'other' },
    irrigationMethod: { type: String, enum: ['rainfed', 'canal', 'tubewell', 'drip', 'sprinkler', 'other'], default: 'rainfed' },
    waterSource: { type: String, trim: true },
    notes: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

export const Farm = mongoose.model('Farm', farmSchema);
