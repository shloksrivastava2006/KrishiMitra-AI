import { env } from '../config/env.js';

export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong';

  if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors).map((e) => e.message).join(', '); }
  if (err.name === 'CastError') { status = 400; message = 'Invalid identifier'; }
  if (err.code === 11000) { status = 409; message = 'A record with this value already exists'; }

  if (status === 500) console.error(err);
  // Never leak internals for unexpected errors in production.
  if (status === 500 && env.nodeEnv === 'production') message = 'Internal server error';

  res.status(status).json({ success: false, message, details: err.details });
}
