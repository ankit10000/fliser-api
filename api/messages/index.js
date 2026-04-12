import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/middleware.js';
import Message from '../../models/Message.js';

function makeChatRoomId(id1, id2) {
  return [id1, id2].sort().join('-');
}

async function handler(req, res) {
  await connectDB();

  if (req.method === 'POST') {
    const { receiverId, message } = req.body;
    if (!receiverId || !message) {
      return res.status(400).json({ error: 'receiverId and message are required' });
    }

    const chatRoomId = makeChatRoomId(req.user.id, receiverId);
    const msg = await Message.create({
      chatRoomId,
      senderId: req.user.id,
      receiverId,
      message,
    });

    return res.status(201).json(msg);
  }

  if (req.method === 'GET') {
    const { with: withUserId, after, limit = 50 } = req.query;
    if (!withUserId) return res.status(400).json({ error: 'with param (userId) is required' });

    const chatRoomId = makeChatRoomId(req.user.id, withUserId);
    const filter = { chatRoomId };
    if (after) filter.createdAt = { $gt: new Date(after) };

    const messages = await Message.find(filter)
      .sort({ createdAt: 1 })
      .limit(parseInt(limit))
      .lean();

    await Message.updateMany(
      { chatRoomId, receiverId: req.user.id, isRead: false },
      { isRead: true }
    );

    return res.status(200).json({ messages, serverTime: new Date().toISOString() });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
