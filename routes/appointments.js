import { Router } from 'express';
import { requireAuth } from '../lib/middleware.js';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';

const router = Router();
const TRANSITIONS = {
  doctor: { pending: ['confirmed', 'cancelled'], confirmed: ['completed', 'cancelled'] },
  patient: { pending: ['cancelled'], confirmed: ['cancelled'] },
};

router.get('/', requireAuth, async (req, res) => {
  const { status, page = 1, limit = 20, startDate, endDate } = req.query;
  const filter = req.user.role === 'patient' ? { patientId: req.user.id } : { doctorId: req.user.id };
  if (status) filter.status = status;
  if (startDate || endDate) { filter.date = {}; if (startDate) filter.date.$gte = new Date(startDate); if (endDate) filter.date.$lte = new Date(endDate); }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [appointments, total] = await Promise.all([
    Appointment.find(filter).sort({ date: 1 }).skip(skip).limit(parseInt(limit)).lean(),
    Appointment.countDocuments(filter),
  ]);
  return res.status(200).json({ appointments, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

router.post('/', requireAuth, async (req, res) => {
  if (req.user.role !== 'patient') return res.status(403).json({ error: 'Only patients can book' });
  const { doctorId, date, description, phone } = req.body;
  if (!doctorId || !date || !phone) return res.status(400).json({ error: 'doctorId, date, phone required' });

  const appointmentDate = new Date(date);
  const existing = await Appointment.findOne({ doctorId, date: appointmentDate, status: { $in: ['pending', 'confirmed'] } });
  if (existing) return res.status(409).json({ error: 'This time slot is already booked' });

  const [patient, doctor] = await Promise.all([
    User.findById(req.user.id).select('name').lean(),
    User.findById(doctorId).select('name role').lean(),
  ]);
  if (!doctor || doctor.role !== 'doctor') return res.status(404).json({ error: 'Doctor not found' });

  const appointment = await Appointment.create({ patientId: req.user.id, doctorId, patientName: patient.name, doctorName: doctor.name, phone, description: description || '', date: appointmentDate });
  return res.status(201).json(appointment);
});

router.get('/:id', requireAuth, async (req, res) => {
  const appt = await Appointment.findById(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Not found' });
  if (appt.patientId.toString() !== req.user.id && appt.doctorId.toString() !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  return res.status(200).json(appt);
});

router.put('/:id', requireAuth, async (req, res) => {
  const appt = await Appointment.findById(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Not found' });
  const isDoctor = appt.doctorId.toString() === req.user.id;
  const isPatient = appt.patientId.toString() === req.user.id;
  if (!isDoctor && !isPatient) return res.status(403).json({ error: 'Forbidden' });

  const { status, notes, cancelReason } = req.body;
  const role = isDoctor ? 'doctor' : 'patient';
  const allowed = TRANSITIONS[role][appt.status] || [];
  if (!allowed.includes(status)) return res.status(400).json({ error: `Cannot transition from '${appt.status}' to '${status}' as ${role}` });

  const updates = { status };
  if (notes !== undefined) updates.notes = notes;
  if (cancelReason !== undefined) updates.cancelReason = cancelReason;
  const updated = await Appointment.findByIdAndUpdate(req.params.id, updates, { new: true });
  return res.status(200).json(updated);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const appt = await Appointment.findById(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Not found' });
  if (appt.patientId.toString() !== req.user.id) return res.status(403).json({ error: 'Only patient can delete' });
  if (appt.status !== 'pending') return res.status(400).json({ error: 'Can only delete pending appointments' });
  await Appointment.findByIdAndDelete(req.params.id);
  return res.status(200).json({ message: 'Deleted' });
});

export default router;
