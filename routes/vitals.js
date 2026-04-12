import { Router } from 'express';
import { requireAuth } from '../lib/middleware.js';
import Vital from '../models/Vital.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { patientId, from, to, limit = 30 } = req.query;
  const targetId = req.user.role === 'patient' ? req.user.id : patientId;
  if (!targetId) return res.status(400).json({ error: 'patientId required' });
  const filter = { patientId: targetId };
  if (from || to) { filter.recordedAt = {}; if (from) filter.recordedAt.$gte = new Date(from); if (to) filter.recordedAt.$lte = new Date(to); }
  return res.status(200).json({ vitals: await Vital.find(filter).sort({ recordedAt: -1 }).limit(parseInt(limit)).lean() });
});

router.get('/latest', requireAuth, async (req, res) => {
  const targetId = req.user.role === 'patient' ? req.user.id : req.query.patientId;
  if (!targetId) return res.status(400).json({ error: 'patientId required' });
  return res.status(200).json({ vital: await Vital.findOne({ patientId: targetId }).sort({ recordedAt: -1 }).lean() });
});

router.post('/', requireAuth, async (req, res) => {
  const { patientId, bloodPressureSystolic, bloodPressureDiastolic, heartRate, temperature, oxygenSaturation, bloodSugar, weight, height, notes, recordedAt } = req.body;
  const targetId = req.user.role === 'patient' ? req.user.id : patientId;
  if (!targetId) return res.status(400).json({ error: 'patientId required' });
  const vital = await Vital.create({ patientId: targetId, recordedBy: req.user.id, bloodPressureSystolic: bloodPressureSystolic || null, bloodPressureDiastolic: bloodPressureDiastolic || null, heartRate: heartRate || null, temperature: temperature || null, oxygenSaturation: oxygenSaturation || null, bloodSugar: bloodSugar || null, weight: weight || null, height: height || null, notes: notes || '', recordedAt: recordedAt ? new Date(recordedAt) : new Date() });
  return res.status(201).json(vital);
});

export default router;
