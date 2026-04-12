import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/middleware.js';
import Doctor from '../../models/Doctor.js';
import Appointment from '../../models/Appointment.js';

function generateSlots(startTime, endTime, durationMinutes) {
  const slots = [];
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let current = sh * 60 + sm;
  const end = eh * 60 + em;

  while (current + durationMinutes <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, '0');
    const m = (current % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
    current += durationMinutes;
  }
  return slots;
}

async function handler(req, res) {
  await connectDB();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date query param (YYYY-MM-DD) required' });

  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();

  const doc = await Doctor.findOne({ userId: id }).select('openHour closeHour availability').lean();
  if (!doc) return res.status(404).json({ error: 'Doctor not found' });

  const dayAvailability = doc.availability?.find((a) => a.dayOfWeek === dayOfWeek);
  const startTime = dayAvailability?.startTime || doc.openHour || '09:00';
  const endTime = dayAvailability?.endTime || doc.closeHour || '21:00';
  const duration = dayAvailability?.slotDurationMinutes || 30;

  const allSlots = generateSlots(startTime, endTime, duration);

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const bookedAppointments = await Appointment.find({
    doctorId: id,
    date: { $gte: dayStart, $lte: dayEnd },
    status: { $in: ['pending', 'confirmed'] },
  }).select('date').lean();

  const bookedSlots = bookedAppointments.map((a) => {
    const h = a.date.getHours().toString().padStart(2, '0');
    const m = a.date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  });

  const availableSlots = allSlots.filter((s) => !bookedSlots.includes(s));

  return res.status(200).json({ date, doctorId: id, availableSlots, bookedSlots });
}

export default requireAuth(handler);
