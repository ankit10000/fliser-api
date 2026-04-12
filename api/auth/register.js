import bcrypt from 'bcryptjs';
import { connectDB } from '../../lib/db.js';
import { signAccessToken, signRefreshToken } from '../../lib/auth.js';
import { setCors, handleOptions } from '../../lib/cors.js';
import User from '../../models/User.js';
import Doctor from '../../models/Doctor.js';
import Patient from '../../models/Patient.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  setCors(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await connectDB();

  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password, role are required' });
  }
  if (!['doctor', 'patient'].includes(role)) {
    return res.status(400).json({ error: 'role must be doctor or patient' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash, role });

  if (role === 'doctor') {
    await Doctor.create({ userId: user._id });
  } else {
    await Patient.create({ userId: user._id });
  }

  const payload = { id: user._id.toString(), role: user.role, name: user.name, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const refreshHash = await bcrypt.hash(refreshToken, 10);
  await User.findByIdAndUpdate(user._id, { refreshToken: refreshHash });

  return res.status(201).json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto,
    },
    accessToken,
    refreshToken,
  });
}
