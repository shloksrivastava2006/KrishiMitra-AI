import { FarmTask } from '../models/FarmTask.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Every query starts from owner = the signed-in farmer.
export const listTasks = asyncHandler(async (req, res) => {
  const tasks = await FarmTask.find({ owner: req.user._id }).sort({ done: 1, dueDate: 1 }).limit(500);
  res.json({ success: true, data: tasks });
});

export const createTask = asyncHandler(async (req, res) => {
  const { title, crop, category, dueDate, notes } = req.body;
  const task = await FarmTask.create({ owner: req.user._id, title, crop: crop || '', category: category || 'other', dueDate, notes });
  res.status(201).json({ success: true, data: task });
});

export const setDone = asyncHandler(async (req, res) => {
  const done = req.body.done !== false;
  const task = await FarmTask.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, { done, doneAt: done ? new Date() : null }, { new: true });
  if (!task) throw new ApiError(404, 'Task not found');
  res.json({ success: true, data: task });
});

export const deleteTask = asyncHandler(async (req, res) => {
  const gone = await FarmTask.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!gone) throw new ApiError(404, 'Task not found');
  res.json({ success: true, message: 'Task deleted' });
});
