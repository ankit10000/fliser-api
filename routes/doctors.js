import { Router } from 'express';
import { requireAuth, requireDoctor } from '../lib/middleware.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';

const router = Router();

// GET /api/doctors — search + filter
router.get('/', requireAuth, async (req, res) => {
  const { search, specialization, minRating, sortBy = 'rating', page = 1, limit = 20 } = req.query;
  const doctorFilter = {};
  if (specialization) doctorFilter.specialization = specialization;
  if (minRating) doctorFilter.rating = { $gte: parseFloat(minRating) };

  const userFilter = { role: 'doctor' };
  if (search) userFilter.name = { $regex: search, $options: 'i' };

  const doctorUserIds = await Doctor.find(doctorFilter).select('userId').lean();
  userFilter._id = { $in: doctorUserIds.map((d) => d.userId) };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find(userFilter).select('_id name email profilePhoto phone address bio').skip(skip).limit(parseInt(limit)).lean(),
    User.countDocuments(userFilter),
  ]);

  const userIdMap = users.reduce((acc, u) => { acc[u._id.toString()] = u; return acc; }, {});
  const doctorProfiles = await Doctor.find({ userId: { $in: users.map((u) => u._id) }, ...doctorFilter }).lean();

  let doctors = doctorProfiles.map((doc) => {
    const user = userIdMap[doc.userId.toString()];
    if (!user) return null;
    return { _id: user._id, name: user.name, email: user.email, profilePhoto: user.profilePhoto, phone: user.phone, address: user.address, bio: user.bio, specialization: doc.specialization, specification: doc.specification, rating: doc.rating, openHour: doc.openHour, closeHour: doc.closeHour, consultationFee: doc.consultationFee, yearsExperience: doc.yearsExperience, isAvailable: doc.isAvailable, languages: doc.languages };
  }).filter(Boolean);

  if (sortBy === 'rating') doctors.sort((a, b) => b.rating - a.rating);
  else if (sortBy === 'name') doctors.sort((a, b) => a.name.localeCompare(b.name));

  return res.status(200).json({ doctors, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

// GET /api/doctors/:id
router.get('/:id', requireAuth, async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash -refreshToken -resetToken -resetTokenExpiry').lean();
  if (!user || user.role !== 'doctor') return res.status(404).json({ error: 'Doctor not found' });
  const doc = await Doctor.findOne({ userId: req.params.id }).lean();
  return res.status(200).json({ ...user, doctorProfile: doc });
});

// PUT /api/doctors/:id
router.put('/:id', requireAuth, async (req, res) => {
  if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });
  const userAllowed = ['name', 'phone', 'address', 'bio', 'profilePhoto'];
  const userUpdates = {};
  for (const key of userAllowed) { if (req.body[key] !== undefined) userUpdates[key] = req.body[key]; }

  const docAllowed = ['specialization', 'specification', 'openHour', 'closeHour', 'consultationFee', 'yearsExperience', 'education', 'languages', 'isAvailable'];
  const docUpdates = {};
  for (const key of docAllowed) { if (req.body[key] !== undefined) docUpdates[key] = req.body[key]; }

  const [user, doc] = await Promise.all([
    User.findByIdAndUpdate(req.params.id, userUpdates, { new: true }).select('-passwordHash -refreshToken'),
    Doctor.findOneAndUpdate({ userId: req.params.id }, docUpdates, { new: true }),
  ]);
  return res.status(200).json({ ...user.toObject(), doctorProfile: doc });
});

// GET /api/doctors/:id/slots
router.get('/:id/slots', requireAuth, async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });

  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();

  const doc = await Doctor.findOne({ userId: req.params.id }).select('openHour closeHour availability').lean();
  if (!doc) return res.status(404).json({ error: 'Doctor not found' });

  const dayAvail = doc.availability?.find((a) => a.dayOfWeek === dayOfWeek);
  const startTime = dayAvail?.startTime || doc.openHour || '09:00';
  const endTime = dayAvail?.endTime || doc.closeHour || '21:00';
  const duration = dayAvail?.slotDurationMinutes || 30;

  const allSlots = [];
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let current = sh * 60 + sm;
  const end = eh * 60 + em;
  while (current + duration <= end) {
    allSlots.push(`${Math.floor(current / 60).toString().padStart(2, '0')}:${(current % 60).toString().padStart(2, '0')}`);
    current += duration;
  }

  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);

  const booked = await Appointment.find({ doctorId: req.params.id, date: { $gte: dayStart, $lte: dayEnd }, status: { $in: ['pending', 'confirmed'] } }).select('date').lean();
  const bookedSlots = booked.map((a) => `${a.date.getHours().toString().padStart(2, '0')}:${a.date.getMinutes().toString().padStart(2, '0')}`);

  return res.status(200).json({ date, doctorId: req.params.id, availableSlots: allSlots.filter((s) => !bookedSlots.includes(s)), bookedSlots });
});

// PUT /api/doctors/:id/availability
router.put('/:id/availability', requireDoctor, async (req, res) => {
  if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Can only update own availability' });
  const { availability } = req.body;
  if (!Array.isArray(availability)) return res.status(400).json({ error: 'availability must be an array' });
  const doc = await Doctor.findOneAndUpdate({ userId: req.params.id }, { availability }, { new: true });
  if (!doc) return res.status(404).json({ error: 'Doctor not found' });
  return res.status(200).json({ availability: doc.availability });
});

export default router;
