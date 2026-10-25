import { body, param } from 'express-validator';

export const idRule = [param('id').isMongoId().withMessage('Invalid id')];

export const farmRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Enter a farm name'),
  body('area').isFloat({ gt: 0 }).withMessage('Land area must be greater than zero'),
  body('latitude').optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('longitude').optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('unit').optional().isIn(['acre', 'hectare', 'sqm', 'sqft', 'bigha']).withMessage('Unsupported unit'),
  body('soilType').optional().isIn(['alluvial', 'black', 'red', 'laterite', 'sandy', 'loamy', 'clay', 'other']),
  body('irrigationMethod').optional().isIn(['rainfed', 'canal', 'tubewell', 'drip', 'sprinkler', 'other']),
];

export const cropRules = [
  body('farm').isMongoId().withMessage('Choose a farm'),
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Enter a crop name'),
  body('area').isFloat({ gt: 0 }).withMessage('Cultivated area must be greater than zero'),
  body('sowingDate').isISO8601().withMessage('Enter a valid sowing date'),
  body('expectedHarvestDate').optional({ checkFalsy: true }).isISO8601().withMessage('Enter a valid harvest date'),
];
