import { User } from '../models/User.js';

// Who may block or delete whom. One rule set, used by the list (to show/hide buttons) and by the endpoints (to enforce it).
//  - Nobody can act on their own account.
//  - The main admin is permanent: nobody can block or delete it.
//  - Farmers, sellers and customers can be managed by any admin.
//  - Other (sub) admins can be managed only by the main admin.
export function accessFor(actor, target) {
  const none = { canBlock: false, canDelete: false };
  if (String(actor._id) === String(target._id)) return none;
  if (target.isMainAdmin) return none;
  if (target.role === 'admin' && !actor.isMainAdmin) return none;
  return { canBlock: true, canDelete: true };
}

// Older databases have admins but none is marked main. The oldest admin becomes the main admin once, at startup.
export async function ensureMainAdmin() {
  if (await User.exists({ role: 'admin', isMainAdmin: true })) return null;
  const first = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
  if (!first) return null;
  first.isMainAdmin = true;
  await first.save();
  console.log(`Main admin set: ${first.email}`);
  return first;
}
