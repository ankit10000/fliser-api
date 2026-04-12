import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/middleware.js';
import Prescription from '../../models/Prescription.js';
import User from '../../models/User.js';

async function handler(req, res) {
  await connectDB();

  if (req.method === 'GET') {
    const { patientId, appointmentId, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (req.user.role === 'patient') {
      filter.patientId = req.user.id;
    } else {
      filter.doctorId = req.user.id;
      if (patientId) filter.patientId = patientId;
    }
    if (appointmentId) filter.appointmentId = appointmentId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [prescriptions, total] = await Promise.all([
      Prescription.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Prescription.countDocuments(filter),
    ]);

    return res.status(200).json({ prescriptions, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  }

  if (req.method === 'POST') {
    if (req.user.role !== 'doctor') return res.status(403).json({ error: 'Only doctors can write prescriptions' });

    const { patientId, appointmentId, diagnosis, medicines, notes, validUntil } = req.body;
    if (!patientId || !diagnosis || !medicines?.length) {
      return res.status(400).json({ error: 'patientId, diagnosis, medicines are required' });
    }

    const patient = await User.findById(patientId).select('name').lean();
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const prescription = await Prescription.create({
      appointmentId: appointmentId || null,
      doctorId: req.user.id,
      patientId,
      doctorName: req.user.name,
      patientName: patient.name,
      diagnosis,
      medicines,
      notes: notes || '',
      validUntil: validUntil ? new Date(validUntil) : null,
    });

    return res.status(201).json(prescription);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
