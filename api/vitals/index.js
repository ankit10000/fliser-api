import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/middleware.js';
import Vital from '../../models/Vital.js';

async function handler(req, res) {
  await connectDB();

  if (req.method === 'GET') {
    const { patientId, from, to, limit = 30 } = req.query;

    const targetId = req.user.role === 'patient' ? req.user.id : patientId;
    if (!targetId) return res.status(400).json({ error: 'patientId required' });

    if (req.user.role === 'patient' && targetId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const filter = { patientId: targetId };
    if (from || to) {
      filter.recordedAt = {};
      if (from) filter.recordedAt.$gte = new Date(from);
      if (to) filter.recordedAt.$lte = new Date(to);
    }

    const vitals = await Vital.find(filter).sort({ recordedAt: -1 }).limit(parseInt(limit)).lean();
    return res.status(200).json({ vitals });
  }

  if (req.method === 'POST') {
    const { patientId, bloodPressureSystolic, bloodPressureDiastolic, heartRate, temperature, oxygenSaturation, bloodSugar, weight, height, notes, recordedAt } = req.body;

    const targetId = req.user.role === 'patient' ? req.user.id : patientId;
    if (!targetId) return res.status(400).json({ error: 'patientId required' });

    const vital = await Vital.create({
      patientId: targetId,
      recordedBy: req.user.id,
      bloodPressureSystolic: bloodPressureSystolic || null,
      bloodPressureDiastolic: bloodPressureDiastolic || null,
      heartRate: heartRate || null,
      temperature: temperature || null,
      oxygenSaturation: oxygenSaturation || null,
      bloodSugar: bloodSugar || null,
      weight: weight || null,
      height: height || null,
      notes: notes || '',
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
    });

    return res.status(201).json(vital);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
