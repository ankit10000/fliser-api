import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/middleware.js';
import Appointment from '../../models/Appointment.js';
import User from '../../models/User.js';

async function handler(req, res) {
  await connectDB();

  if (req.method === 'GET') {
    const { status, page = 1, limit = 20, startDate, endDate } = req.query;

    const filter = req.user.role === 'patient'
      ? { patientId: req.user.id }
      : { doctorId: req.user.id };

    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [appointments, total] = await Promise.all([
      Appointment.find(filter).sort({ date: 1 }).skip(skip).limit(parseInt(limit)).lean(),
      Appointment.countDocuments(filter),
    ]);

    return res.status(200).json({
      appointments,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  }

  if (req.method === 'POST') {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can book appointments' });
    }

    const { doctorId, date, description, phone } = req.body;
    if (!doctorId || !date || !phone) {
      return res.status(400).json({ error: 'doctorId, date, phone are required' });
    }

    const appointmentDate = new Date(date);

    const existing = await Appointment.findOne({
      doctorId,
      date: appointmentDate,
      status: { $in: ['pending', 'confirmed'] },
    });
    if (existing) {
      return res.status(409).json({ error: 'This time slot is already booked' });
    }

    const [patient, doctor] = await Promise.all([
      User.findById(req.user.id).select('name').lean(),
      User.findById(doctorId).select('name').lean(),
    ]);

    if (!doctor || doctor.role === 'patient') {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const appointment = await Appointment.create({
      patientId: req.user.id,
      doctorId,
      patientName: patient.name,
      doctorName: doctor.name,
      phone,
      description: description || '',
      date: appointmentDate,
    });

    return res.status(201).json(appointment);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
