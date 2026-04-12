import { connectDB } from '../../lib/db.js';
import { requireDoctor } from '../../lib/middleware.js';
import Appointment from '../../models/Appointment.js';
import User from '../../models/User.js';
import Doctor from '../../models/Doctor.js';
import Prescription from '../../models/Prescription.js';

async function handler(req, res) {
  await connectDB();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const doctorId = req.user.id;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    appointmentsToday,
    appointmentsPending,
    appointmentsCompleted,
    appointmentsCancelled,
    upcomingAppointments,
    recentPrescriptionsCount,
    doctorProfile,
    totalPatientsResult,
    newPatientsThisMonth,
  ] = await Promise.all([
    Appointment.countDocuments({ doctorId, date: { $gte: todayStart, $lte: todayEnd } }),
    Appointment.countDocuments({ doctorId, status: 'pending' }),
    Appointment.countDocuments({ doctorId, status: 'completed' }),
    Appointment.countDocuments({ doctorId, status: 'cancelled' }),
    Appointment.find({ doctorId, date: { $gte: new Date() }, status: { $in: ['pending', 'confirmed'] } })
      .sort({ date: 1 }).limit(5).lean(),
    Prescription.countDocuments({ doctorId, createdAt: { $gte: todayStart } }),
    Doctor.findOne({ userId: doctorId }).select('rating').lean(),
    Appointment.distinct('patientId', { doctorId }),
    Appointment.distinct('patientId', { doctorId, createdAt: { $gte: monthStart } }),
  ]);

  return res.status(200).json({
    totalPatients: totalPatientsResult.length,
    appointmentsToday,
    appointmentsPending,
    appointmentsCompleted,
    appointmentsCancelled,
    upcomingAppointments,
    recentPrescriptions: recentPrescriptionsCount,
    averageRating: doctorProfile?.rating || 0,
    newPatientsThisMonth: newPatientsThisMonth.length,
  });
}

export default requireDoctor(handler);
