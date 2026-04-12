import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/middleware.js';
import Message from '../../models/Message.js';
import User from '../../models/User.js';
import mongoose from 'mongoose';

async function handler(req, res) {
  await connectDB();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = new mongoose.Types.ObjectId(req.user.id);

  const conversations = await Message.aggregate([
    { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$chatRoomId',
        lastMessage: { $first: '$message' },
        lastMessageAt: { $first: '$createdAt' },
        senderId: { $first: '$senderId' },
        receiverId: { $first: '$receiverId' },
        unreadCount: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$receiverId', userId] }, { $eq: ['$isRead', false] }] },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { lastMessageAt: -1 } },
  ]);

  const otherUserIds = conversations.map((c) => {
    const sId = c.senderId.toString();
    return sId === req.user.id ? c.receiverId : c.senderId;
  });

  const users = await User.find({ _id: { $in: otherUserIds } }).select('name profilePhoto').lean();
  const userMap = users.reduce((acc, u) => { acc[u._id.toString()] = u; return acc; }, {});

  const result = conversations.map((c) => {
    const otherId = c.senderId.toString() === req.user.id ? c.receiverId.toString() : c.senderId.toString();
    const otherUser = userMap[otherId];
    return {
      userId: otherId,
      name: otherUser?.name || 'Unknown',
      profilePhoto: otherUser?.profilePhoto || null,
      lastMessage: c.lastMessage,
      lastMessageAt: c.lastMessageAt,
      unreadCount: c.unreadCount,
    };
  });

  return res.status(200).json({ conversations: result });
}

export default requireAuth(handler);
