import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();
router.get('/', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({ success: true, data: { status: 'ok', database: states[mongoose.connection.readyState], uptimeSeconds: Math.round(process.uptime()) } });
});
export default router;
