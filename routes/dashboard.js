import { Router } from 'express';
import { requireDoctor } from '../lib/middleware.js';
import Appointment from '../models/Appointment.js';
import Prescription from '../models/Prescription.js';
import Doctor from '../models/Doctor.js';

const router = Router();

router.get('/', requireDoctor, async (req, res) => {
  const doctorId = req.user.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayAppts, pendingAppts, completedAppts, totalPatients, recentAppts, doctorProfile] = await Promise.all([
    Appointment.countDocuments({ doctorId, date: { $gte: today, $lt: tomorrow } }),
    Appointment.countDocuments({ doctorId, status: 'pending' }),
    Appointment.countDocuments({ doctorId, status: 'completed' }),
    Appointment.distinct('patientId', { doctorId }),
    Appointment.find({ doctorId, date: { $gte: today, $lt: tomorrow } })
      .sort({ date: 1 })
      .limit(10)
      .lean(),
    Doctor.findOne({ userId: doctorId }).select('rating').lean(),
  ]);

  return res.status(200).json({
    stats: {
      todayAppointments: todayAppts,
      pendingApprovals: pendingAppts,
      completedAppointments: completedAppts,
      totalPatients: totalPatients.length,
      avgRating: doctorProfile?.rating || 0,
    },
    todaySchedule: recentAppts,
  });
});

export default router;
