import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/middleware.js';
import User from '../../models/User.js';
import Doctor from '../../models/Doctor.js';

async function handler(req, res) {
  await connectDB();

  const { id } = req.query;

  if (req.method === 'GET') {
    const user = await User.findById(id).select('-passwordHash -refreshToken -resetToken -resetTokenExpiry').lean();
    if (!user || user.role !== 'doctor') return res.status(404).json({ error: 'Doctor not found' });

    const doc = await Doctor.findOne({ userId: id }).lean();
    return res.status(200).json({ ...user, doctorProfile: doc });
  }

  if (req.method === 'PUT') {
    if (req.user.id !== id && req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userAllowed = ['name', 'phone', 'address', 'bio', 'profilePhoto'];
    const userUpdates = {};
    for (const key of userAllowed) {
      if (req.body[key] !== undefined) userUpdates[key] = req.body[key];
    }

    const docAllowed = ['specialization', 'specification', 'openHour', 'closeHour', 'consultationFee', 'yearsExperience', 'education', 'languages', 'isAvailable'];
    const docUpdates = {};
    for (const key of docAllowed) {
      if (req.body[key] !== undefined) docUpdates[key] = req.body[key];
    }

    const [user, doc] = await Promise.all([
      User.findByIdAndUpdate(id, userUpdates, { new: true }).select('-passwordHash -refreshToken'),
      Doctor.findOneAndUpdate({ userId: id }, docUpdates, { new: true }),
    ]);

    return res.status(200).json({ ...user.toObject(), doctorProfile: doc });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
