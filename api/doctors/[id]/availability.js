import { connectDB } from '../../lib/db.js';
import { requireDoctor } from '../../lib/middleware.js';
import Doctor from '../../models/Doctor.js';

async function handler(req, res) {
  await connectDB();

  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (req.user.id !== id) return res.status(403).json({ error: 'Can only update your own availability' });

  const { availability } = req.body;
  if (!Array.isArray(availability)) return res.status(400).json({ error: 'availability must be an array' });

  const doc = await Doctor.findOneAndUpdate({ userId: id }, { availability }, { new: true });
  if (!doc) return res.status(404).json({ error: 'Doctor not found' });

  return res.status(200).json({ availability: doc.availability });
}

export default requireDoctor(handler);
