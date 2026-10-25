import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { protect, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { MAX_UPLOAD_BYTES, saveImage } from '../services/imageService.js';
import { MAX_IMAGES } from '../services/marketRules.js';

const router = Router();
const uploader = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES, files: MAX_IMAGES, fields: 2 } });
const perUser = rateLimit({ windowMs: 60 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => String(req.user._id),
  message: { success: false, message: 'Upload limit reached. Try again later' } });

router.post('/images', protect, authorize('farmer', 'vendor'), perUser,
  (req, res, next) => uploader.array('images', MAX_IMAGES)(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(413, 'Each photo must be 3 MB or smaller'));
    return next(new ApiError(400, `Upload up to ${MAX_IMAGES} photos in the "images" field`));
  }),
  asyncHandler(async (req, res) => {
    if (!req.files?.length) throw new ApiError(400, 'Choose at least one photo');
    const urls = [];
    for (const f of req.files) {
      const url = await saveImage(f.buffer);
      if (!url) throw new ApiError(415, 'Only JPG, PNG or WebP photos are allowed');
      urls.push(url);
    }
    res.status(201).json({ success: true, data: { urls } });
  }));
export default router;
