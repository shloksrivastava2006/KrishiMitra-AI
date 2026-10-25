import { DiseaseCheck } from '../models/DiseaseCheck.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { GROWTH_STAGES, MAX_QUESTION, MIN_SYMPTOMS, PLANT_PARTS, askFallback, askOrBasic, cleanChoice, cleanCrop, cleanLanguage, cleanSymptoms, cleanText, detectImageType, diagnoseOrBasic } from '../services/diseaseService.js';
import { basicGuidance } from '../services/basicGuidance.js';

export const status = (req, res) => res.json({ success: true, data: { enabled: Boolean(env.geminiApiKey), basic: true } });   // basic written guidance works with or without the AI

export const diagnosePhoto = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const crop = cleanCrop(body.crop);
  const symptoms = cleanSymptoms(body.symptoms);
  const language = cleanLanguage(body.language);
  const plantPart = cleanChoice(body.plantPart, PLANT_PARTS); const stage = cleanChoice(body.stage, GROWTH_STAGES);
  let mime;
  if (req.file) {
    mime = detectImageType(req.file.buffer);
    if (!mime) throw new ApiError(400, 'Only JPEG, PNG or WebP photos are accepted');
  } else if (symptoms.length < MIN_SYMPTOMS) {
    throw new ApiError(400, 'Write a few words about the problem, or add a photo');
  }
  // Over the hourly AI allowance (see the route) or AI unavailable: the farmer still gets the basic guidance, never an error.
  const result = req.aiLimited
    ? basicGuidance({ crop, symptoms, language, hasPhoto: Boolean(req.file) })
    : await diagnoseOrBasic({ buffer: req.file?.buffer, mime, crop, symptoms, language, plantPart, stage });
  const saved = await DiseaseCheck.create({ owner: req.user._id, crop: crop || undefined, symptoms: symptoms || undefined, language, model: result.source === 'ai' ? env.geminiModel : 'basic', result });
  res.status(201).json({ success: true, data: { id: saved._id, createdAt: saved.createdAt, crop, symptoms, language, result } });
});

export const history = asyncHandler(async (req, res) => {
  const items = await DiseaseCheck.find({ owner: req.user._id }).sort({ createdAt: -1 }).limit(20);
  res.json({ success: true, data: items.map((d) => ({ id: d._id, createdAt: d.createdAt, crop: d.crop, symptoms: d.symptoms, language: d.language, result: d.result })) });
});

// Instant answer from the built-in guidance while the AI works on the full check. Free to run, nothing is saved.
export const quick = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const symptoms = cleanSymptoms(body.symptoms);
  if (symptoms.length < MIN_SYMPTOMS) throw new ApiError(400, 'Write a few words about the problem');
  res.json({ success: true, data: { result: basicGuidance({ crop: cleanCrop(body.crop), symptoms, language: cleanLanguage(body.language) }) } });
});

// Owner-scoped: someone else's id behaves like a missing record.
export const removeCheck = asyncHandler(async (req, res) => {
  const deleted = await DiseaseCheck.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!deleted) throw new ApiError(404, 'Record not found');
  res.json({ success: true, message: 'Deleted' });
});

// A short follow-up question about the result on screen. Nothing is saved. Over the hourly allowance or AI unavailable: general advice, not an error.
export const askMore = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const question = cleanText(body.question, MAX_QUESTION);
  if (question.length < MIN_SYMPTOMS) throw new ApiError(400, 'Write your question');
  const language = cleanLanguage(body.language);
  const args = { question, disease: cleanText(body.disease, 120), crop: cleanCrop(body.crop), language };
  const result = req.aiLimited ? askFallback(language, question) : await askOrBasic(args);
  res.json({ success: true, data: result });
});
