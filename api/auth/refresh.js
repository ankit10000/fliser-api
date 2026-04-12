import bcrypt from 'bcryptjs';
import { connectDB } from '../../lib/db.js';
import { signAccessToken, verifyRefreshToken } from '../../lib/auth.js';
import { setCors, handleOptions } from '../../lib/cors.js';
import User from '../../models/User.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  setCors(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await connectDB();

  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required' });
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const user = await User.findById(decoded.id).select('refreshToken role name email');
  if (!user || !user.refreshToken) {
    return res.status(401).json({ error: 'Session expired, please login again' });
  }

  const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  const payload = { id: user._id.toString(), role: user.role, name: user.name, email: user.email };
  const newAccessToken = signAccessToken(payload);

  return res.status(200).json({ accessToken: newAccessToken });
}
