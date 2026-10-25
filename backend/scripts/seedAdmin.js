// Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... node scripts/seedAdmin.js
// The only way to create an administrator; public registration rejects the admin role.
import { env } from '../config/env.js';
import { connectDatabase } from '../config/db.js';
import { User } from '../models/User.js';

const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters).');
  process.exit(1);
}
if (env.missing.length) { console.error(`Missing env: ${env.missing.join(', ')}`); process.exit(1); }

await connectDatabase();
// The first admin created this way is the permanent main admin. Later ones are ordinary admins that the main admin can remove.
const isMainAdmin = !(await User.exists({ role: 'admin', isMainAdmin: true }));
await User.create({ name: 'Administrator', email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin', isMainAdmin });
console.log(isMainAdmin ? 'Main admin created' : 'Admin created (a main admin already exists, so this one can be removed by it)');
process.exit(0);
