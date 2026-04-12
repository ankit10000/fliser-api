import { Router } from 'express';
import { requireAuth } from '../lib/middleware.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

const router = Router();

function chatRoomId(id1, id2) { return [id1, id2].sort().join('-'); }

router.post('/', requireAuth, async (req, res) => {
  const { receiverId, message } = req.body;
  if (!receiverId || !message) return res.status(400).json({ error: 'receiverId and message required' });
  const msg = await Message.create({ chatRoomId: chatRoomId(req.user.id, receiverId), senderId: req.user.id, receiverId, message });
  return res.status(201).json(msg);
});

router.get('/', requireAuth, async (req, res) => {
  const { with: withUserId, after, limit = 50 } = req.query;
  if (!withUserId) return res.status(400).json({ error: 'with param required' });
  const roomId = chatRoomId(req.user.id, withUserId);
  const filter = { chatRoomId: roomId };
  if (after) filter.createdAt = { $gt: new Date(after) };
  const messages = await Message.find(filter).sort({ createdAt: 1 }).limit(parseInt(limit)).lean();
  await Message.updateMany({ chatRoomId: roomId, receiverId: req.user.id, isRead: false }, { isRead: true });
  return res.status(200).json({ messages, serverTime: new Date().toISOString() });
});

router.get('/conversations', requireAuth, async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);
  const conversations = await Message.aggregate([
    { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$chatRoomId', lastMessage: { $first: '$message' }, lastMessageAt: { $first: '$createdAt' }, senderId: { $first: '$senderId' }, receiverId: { $first: '$receiverId' }, unreadCount: { $sum: { $cond: [{ $and: [{ $eq: ['$receiverId', userId] }, { $eq: ['$isRead', false] }] }, 1, 0] } } } },
    { $sort: { lastMessageAt: -1 } },
  ]);

  const otherUserIds = conversations.map((c) => (c.senderId.toString() === req.user.id ? c.receiverId : c.senderId));
  const users = await User.find({ _id: { $in: otherUserIds } }).select('name profilePhoto').lean();
  const userMap = users.reduce((acc, u) => { acc[u._id.toString()] = u; return acc; }, {});

  const result = conversations.map((c) => {
    const otherId = c.senderId.toString() === req.user.id ? c.receiverId.toString() : c.senderId.toString();
    const otherUser = userMap[otherId];
    return { userId: otherId, name: otherUser?.name || 'Unknown', profilePhoto: otherUser?.profilePhoto || null, lastMessage: c.lastMessage, lastMessageAt: c.lastMessageAt, unreadCount: c.unreadCount };
  });
  return res.status(200).json({ conversations: result });
});

export default router;
