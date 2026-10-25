import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import farmRoutes from './routes/farmRoutes.js';
import cropRoutes from './routes/cropRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import calculatorRoutes from './routes/calculatorRoutes.js';
import recommendRoutes from './routes/recommendRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import weatherRoutes from './routes/weatherRoutes.js';
import mandiRoutes from './routes/mandiRoutes.js';
import coldStorageRoutes from './routes/coldStorageRoutes.js';
import diseaseRoutes from './routes/diseaseRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import { razorpayWebhook } from './controllers/orderController.js';
import sellerRoutes from './routes/sellerRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import farmerRoutes from './routes/farmerRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import rentalRoutes from './routes/rentalRoutes.js';
import payoutRoutes from './routes/payoutRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import ledgerRoutes from './routes/ledgerRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import irrigationRoutes from './routes/irrigationRoutes.js';
import { UPLOAD_DIR } from './services/imageService.js';
import healthRoutes from './routes/healthRoutes.js';

const app = express();

app.use(helmet());
// Product photos are shown on the frontend's own origin, so they must be allowed cross-origin. Only images we saved live here.
app.use('/uploads', (req, res, next) => { res.set('Cross-Origin-Resource-Policy', 'cross-origin'); next(); },
  express.static(UPLOAD_DIR, { index: false, dotfiles: 'deny', maxAge: '7d', setHeaders: (res) => res.set('X-Content-Type-Options', 'nosniff') }));
app.use(cors({
  origin(origin, callback) {
    // Allow non-browser tools (no Origin header) and the configured frontends only.
    const isLocalDev = env.nodeEnv !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '');
    if (!origin || isLocalDev || env.clientOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
}));
// Razorpay signs the exact raw bytes, so this route must see the body before express.json() parses it.
app.post('/api/payments/razorpay/webhook', express.raw({ type: 'application/json', limit: '100kb' }), razorpayWebhook);
app.use(express.json({ limit: '100kb' }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 200, standardHeaders: true, legacyHeaders: false }));

app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/crops', cropRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/calculator', calculatorRoutes);
app.use('/api/recommend', recommendRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/mandi', mandiRoutes);
app.use('/api/cold-storage', coldStorageRoutes);
app.use('/api/disease', diseaseRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/farmer', farmerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/payout', payoutRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/irrigation', irrigationRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
