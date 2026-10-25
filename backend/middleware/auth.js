import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Verifies the bearer token and loads the user from the database on every request,
// so role changes, disabled accounts and logouts take effect immediately
// (role is never trusted from the client or from the token).
export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Please log in to continue');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new ApiError(401, 'Your session has expired. Please log in again');
  }

  const user = await User.findById(payload.id).select('+tokenVersion');
  if (!user || !user.isActive) throw new ApiError(401, 'Account not found or disabled');
  if ((payload.tv ?? 0) !== (user.tokenVersion ?? 0)) throw new ApiError(401, 'Your session has ended. Please log in again');
  req.user = user;
  next();
});

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return next(new ApiError(403, 'You do not have permission to do this'));
  next();
};
