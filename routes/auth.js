import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/auth.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ error: 'name, email, password, role are required' });
  if (!['doctor', 'patient'].includes(role))
    return res.status(400).json({ error: 'role must be doctor or patient' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash, role });

  if (role === 'doctor') await Doctor.create({ userId: user._id });
  else await Patient.create({ userId: user._id });

  const payload = { id: user._id.toString(), role: user.role, name: user.name, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const refreshHash = await bcrypt.hash(refreshToken, 10);
  await User.findByIdAndUpdate(user._id, { refreshToken: refreshHash });

  return res.status(201).json({
    user: { _id: user._id, name: user.name, email: user.email, role: user.role, profilePhoto: user.profilePhoto },
    accessToken,
    refreshToken,
  });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

  let profileExtra = {};
  if (user.role === 'doctor') {
    const doc = await Doctor.findOne({ userId: user._id }).select('specialization rating');
    if (doc) profileExtra = { specialization: doc.specialization, rating: doc.rating };
  }

  const payload = { id: user._id.toString(), role: user.role, name: user.name, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const refreshHash = await bcrypt.hash(refreshToken, 10);
  await User.findByIdAndUpdate(user._id, { refreshToken: refreshHash });

  return res.status(200).json({
    user: { _id: user._id, name: user.name, email: user.email, role: user.role, profilePhoto: user.profilePhoto, phone: user.phone, address: user.address, bio: user.bio, ...profileExtra },
    accessToken,
    refreshToken,
  });
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });

  let decoded;
  try { decoded = verifyRefreshToken(refreshToken); } catch { return res.status(401).json({ error: 'Invalid or expired refresh token' }); }

  const user = await User.findById(decoded.id).select('refreshToken role name email');
  if (!user || !user.refreshToken) return res.status(401).json({ error: 'Session expired' });

  const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
  if (!isValid) return res.status(401).json({ error: 'Invalid refresh token' });

  const payload = { id: user._id.toString(), role: user.role, name: user.name, email: user.email };
  return res.status(200).json({ accessToken: signAccessToken(payload) });
});

export default router;
