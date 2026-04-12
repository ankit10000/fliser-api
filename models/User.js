import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['doctor', 'patient'], required: true },
    profilePhoto: { type: String, default: null },
    phone: { type: String, default: null },
    address: { type: String, default: null },
    birthDate: { type: Date, default: null },
    bio: { type: String, default: null },
    refreshToken: { type: String, default: null },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model('User', userSchema);
