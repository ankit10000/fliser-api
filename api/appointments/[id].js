import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/middleware.js';
import Appointment from '../../models/Appointment.js';

const ALLOWED_TRANSITIONS = {
  doctor: { pending: ['confirmed', 'cancelled'], confirmed: ['completed', 'cancelled'] },
  patient: { pending: ['cancelled'], confirmed: ['cancelled'] },
};

async function handler(req, res) {
  await connectDB();
  const { id } = req.query;

  const appt = await Appointment.findById(id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });

  const isPatient = appt.patientId.toString() === req.user.id;
  const isDoctor = appt.doctorId.toString() === req.user.id;
  if (!isPatient && !isDoctor) return res.status(403).json({ error: 'Forbidden' });

  if (req.method === 'GET') {
    return res.status(200).json(appt);
  }

  if (req.method === 'PUT') {
    const { status, notes, cancelReason } = req.body;
    const role = isDoctor ? 'doctor' : 'patient';
    const allowed = ALLOWED_TRANSITIONS[role][appt.status] || [];

    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Cannot transition from '${appt.status}' to '${status}' as ${role}` });
    }

    const updates = { status };
    if (notes !== undefined) updates.notes = notes;
    if (cancelReason !== undefined) updates.cancelReason = cancelReason;

    const updated = await Appointment.findByIdAndUpdate(id, updates, { new: true });
    return res.status(200).json(updated);
  }

  if (req.method === 'DELETE') {
    if (!isPatient) return res.status(403).json({ error: 'Only patient can delete appointment' });
    if (appt.status !== 'pending') return res.status(400).json({ error: 'Can only delete pending appointments' });
    await Appointment.findByIdAndDelete(id);
    return res.status(200).json({ message: 'Appointment deleted' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
