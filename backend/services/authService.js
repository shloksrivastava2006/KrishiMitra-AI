import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// tv = tokenVersion. Logout bumps the user's version, so every token issued before it stops working.
export const signToken = (user) => jwt.sign({ id: user._id, tv: user.tokenVersion ?? 0 }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
