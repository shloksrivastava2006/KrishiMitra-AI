import { Router } from 'express';
import { COLD_STORAGES, COLD_STORAGE_PRINTED_TOTAL, COLD_STORAGE_SOURCE, COLD_STORAGE_YEAR } from '../data/coldStorages.js';

// Public reference data, no database. The global /api rate limit applies.
const router = Router();
router.get('/', (req, res) => res.json({
  success: true,
  data: {
    asOn: COLD_STORAGE_YEAR, source: COLD_STORAGE_SOURCE, total: COLD_STORAGE_PRINTED_TOTAL, states: COLD_STORAGES,
    note: 'The source table is titled sector-wise but gives only the total number and capacity for each State/UT; it has no private, cooperative or public sector split.',
  },
}));
export default router;
