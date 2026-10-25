import { Notification } from '../models/Notification.js';

// Fire-and-forget: a failed notification must never break the order, payment or review that triggered it.
export const notify = (user, type, title, message, link) =>
  Notification.create({ user, type, title, message, link }).catch((e) => console.error('notify failed:', e.message));
