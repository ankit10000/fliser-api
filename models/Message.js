import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    chatRoomId: { type: String, required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ chatRoomId: 1, createdAt: 1 });
messageSchema.index({ receiverId: 1, isRead: 1 });

export default mongoose.models.Message || mongoose.model('Message', messageSchema);
