import mongoose from 'mongoose';

// Stores the written result (and the farmer's own description, if any). The photo itself is not kept (private by default, and no disk to manage).
const schema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    crop: { type: String, trim: true, maxlength: 40 },
    symptoms: { type: String, trim: true, maxlength: 600 },   // what the farmer wrote, if anything
    language: { type: String, default: 'en' },
    model: String,
    result: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const DiseaseCheck = mongoose.model('DiseaseCheck', schema);
