import { Notification } from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const shape = (n) => ({ id: n._id, type: n.type, title: n.title, message: n.message, link: n.link, read: n.read, createdAt: n.createdAt });

// Every query is filtered by req.user: nobody can read or mark another person's notifications.
export const list = asyncHandler(async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ success: true, data: { unread, items: items.map(shape) } });
});
export const markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
  res.json({ success: true });
});
export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ success: true });
});
