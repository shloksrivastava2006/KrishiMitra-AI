import { validationResult } from 'express-validator';

// Runs after express-validator chains and returns a uniform 422 response.
export function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const details = result.array().map((e) => ({ field: e.path, message: e.msg }));
  return res.status(422).json({ success: false, message: details[0].message, details });
}
