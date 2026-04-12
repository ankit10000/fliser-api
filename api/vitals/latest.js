import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/middleware.js';
import Vital from '../../models/Vital.js';

async function handler(req, res) {
  await connectDB();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { patientId } = req.query;
  const targetId = req.user.role === 'patient' ? req.user.id : patientId;
  if (!targetId) return res.status(400).json({ error: 'patientId required' });

  const vital = await Vital.findOne({ patientId: targetId }).sort({ recordedAt: -1 }).lean();
  return res.status(200).json({ vital: vital || null });
}

export default requireAuth(handler);
