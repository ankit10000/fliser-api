import { connectDB } from '../../lib/db.js';
import { requireDoctor } from '../../lib/middleware.js';
import User from '../../models/User.js';
import Patient from '../../models/Patient.js';
import Appointment from '../../models/Appointment.js';

async function handler(req, res) {
  await connectDB();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;

  const [user, patient, recentAppointments] = await Promise.all([
    User.findById(id).select('-passwordHash -refreshToken -resetToken -resetTokenExpiry').lean(),
    Patient.findOne({ userId: id }).lean(),
    Appointment.find({ patientId: id, doctorId: req.user.id }).sort({ date: -1 }).limit(5).lean(),
  ]);

  if (!user || user.role !== 'patient') return res.status(404).json({ error: 'Patient not found' });

  return res.status(200).json({ ...user, patientProfile: patient, recentAppointments });
}

export default requireDoctor(handler);
