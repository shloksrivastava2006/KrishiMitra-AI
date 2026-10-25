import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idRule } from '../validators/farmValidators.js';
import { ApiError } from '../utils/ApiError.js';
import { MAX_IMAGE_BYTES } from '../services/diseaseService.js';
import { status, diagnosePhoto, quick, askMore, history, removeCheck } from '../controllers/diseaseController.js';

const router = Router();
router.use(protect, authorize('farmer'));

// Each AI check costs money, so it is limited per account, not per IP. Going over the limit does not block the farmer:
// the request carries on flagged aiLimited and gets the free basic guidance instead of an error.
const perUser = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => String(req.user._id), handler: (req, res, next) => { req.aiLimited = true; next(); } });
// The instant guidance costs nothing but is still limited so it cannot be used to hammer the server.
const quickLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => String(req.user._id), message: { success: false, message: 'Too many requests. Try again later' } });

const uploader = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 8 } });
const oneImage = (req, res, next) => uploader.single('image')(req, res, (err) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(413, 'Photo is too large (maximum 5 MB)'));
  return next(new ApiError(400, 'Upload failed. Send one photo in the "image" field'));
});

router.get('/status', status);
router.post('/diagnose', perUser, oneImage, diagnosePhoto);
router.post('/quick', quickLimit, quick);
router.post('/ask', perUser, askMore);   // fields: question, disease, crop, language
router.get('/history', history);
router.delete('/history/:id', idRule, validate, removeCheck);
export default router;
