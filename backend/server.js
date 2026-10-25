import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/db.js';
import { expireUnpaidOrders } from './services/orderService.js';
import { ensureMainAdmin } from './services/adminAccess.js';
import { expireUnpaidBookings } from './services/rentalService.js';

if (env.missing.length) {
  console.error(`Missing required environment variables: ${env.missing.join(', ')}. Copy .env.example to .env and fill them in.`);
  process.exit(1);
}

connectDatabase()
  .then(async () => {
    await ensureMainAdmin().catch((e) => console.error('main admin check failed', e.message));
    // Gives stock back when an online payment is abandoned.
    setInterval(() => expireUnpaidOrders().catch((e) => console.error('expire sweep failed', e.message)), 5 * 60 * 1000).unref();
    setInterval(() => expireUnpaidBookings().catch((e) => console.error('rental sweep failed', e.message)), 5 * 60 * 1000).unref();
    return app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port}`));
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  });
