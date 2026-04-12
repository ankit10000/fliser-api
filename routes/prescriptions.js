import { Router } from 'express';
import { requireAuth } from '../lib/middleware.js';
import Prescription from '../models/Prescription.js';
import User from '../models/User.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { patientId, appointmentId, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (req.user.role === 'patient') filter.patientId = req.user.id;
  else { filter.doctorId = req.user.id; if (patientId) filter.patientId = patientId; }
  if (appointmentId) filter.appointmentId = appointmentId;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [prescriptions, total] = await Promise.all([
    Prescription.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Prescription.countDocuments(filter),
  ]);
  return res.status(200).json({ prescriptions, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

router.post('/', requireAuth, async (req, res) => {
  if (req.user.role !== 'doctor') return res.status(403).json({ error: 'Only doctors can write prescriptions' });
  const { patientId, appointmentId, diagnosis, medicines, notes, validUntil } = req.body;
  if (!patientId || !diagnosis || !medicines?.length) return res.status(400).json({ error: 'patientId, diagnosis, medicines required' });
  const patient = await User.findById(patientId).select('name').lean();
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  const rx = await Prescription.create({ appointmentId: appointmentId || null, doctorId: req.user.id, patientId, doctorName: req.user.name, patientName: patient.name, diagnosis, medicines, notes: notes || '', validUntil: validUntil ? new Date(validUntil) : null });
  return res.status(201).json(rx);
});

router.get('/:id', requireAuth, async (req, res) => {
  const rx = await Prescription.findById(req.params.id);
  if (!rx) return res.status(404).json({ error: 'Not found' });
  if (rx.doctorId.toString() !== req.user.id && rx.patientId.toString() !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  return res.status(200).json(rx);
});

router.put('/:id', requireAuth, async (req, res) => {
  const rx = await Prescription.findById(req.params.id);
  if (!rx) return res.status(404).json({ error: 'Not found' });
  if (rx.doctorId.toString() !== req.user.id) return res.status(403).json({ error: 'Only prescribing doctor can edit' });
  if ((Date.now() - rx.createdAt.getTime()) > 86400000) return res.status(400).json({ error: 'Cannot edit after 24 hours' });
  const allowed = ['diagnosis', 'medicines', 'notes', 'validUntil'];
  const updates = {};
  for (const key of allowed) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }
  return res.status(200).json(await Prescription.findByIdAndUpdate(req.params.id, updates, { new: true }));
});

export default router;
