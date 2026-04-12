import bcrypt from 'bcryptjs';
import { connectDB } from '../../lib/db.js';
import { signAccessToken, signRefreshToken } from '../../lib/auth.js';
import { setCors, handleOptions } from '../../lib/cors.js';
import User from '../../models/User.js';
import Doctor from '../../models/Doctor.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  setCors(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await connectDB();

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  let profileExtra = {};
  if (user.role === 'doctor') {
    const doc = await Doctor.findOne({ userId: user._id }).select('specialization rating isAvailable consultationFee');
    if (doc) profileExtra = { specialization: doc.specialization, rating: doc.rating };
  }

  const payload = { id: user._id.toString(), role: user.role, name: user.name, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const refreshHash = await bcrypt.hash(refreshToken, 10);
  await User.findByIdAndUpdate(user._id, { refreshToken: refreshHash });

  return res.status(200).json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto,
      phone: user.phone,
      address: user.address,
      bio: user.bio,
      ...profileExtra,
    },
    accessToken,
    refreshToken,
  });
}
