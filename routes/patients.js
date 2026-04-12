import { Router } from 'express';
import { requireAuth, requireDoctor } from '../lib/middleware.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import Vital from '../models/Vital.js';
import Prescription from '../models/Prescription.js';

const router = Router();

// GET /api/patients/me — patient gets own profile
router.get('/me', requireAuth, async (req, res) => {
  if (req.user.role !== 'patient') return res.status(403).json({ error: 'Patients only' });
  const patient = await Patient.findOne({ userId: req.user.id }).lean();
  return res.status(200).json(patient || {});
});

// PUT /api/patients/me — patient updates own profile
router.put('/me', requireAuth, async (req, res) => {
  if (req.user.role !== 'patient') return res.status(403).json({ error: 'Patients only' });
  const allowed = ['bloodGroup', 'allergies', 'chronicConditions', 'emergencyContactName', 'emergencyContactPhone', 'insuranceProvider', 'insuranceId', 'height', 'weight'];
  const updates = {};
  for (const key of allowed) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }
  const patient = await Patient.findOneAndUpdate({ userId: req.user.id }, updates, { new: true, upsert: true });
  return res.status(200).json(patient);
});

// GET /api/patients — doctor gets list of their patients
router.get('/', requireDoctor, async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const appts = await Appointment.distinct('patientId', { doctorId: req.user.id });
  const userFilter = { _id: { $in: appts }, role: 'patient' };
  if (search) userFilter.name = { $regex: search, $options: 'i' };
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find(userFilter).select('_id name email profilePhoto phone birthDate').skip(skip).limit(parseInt(limit)).lean(),
    User.countDocuments(userFilter),
  ]);
  const patientProfiles = await Patient.find({ userId: { $in: users.map((u) => u._id) } }).lean();
  const profileMap = patientProfiles.reduce((acc, p) => { acc[p.userId.toString()] = p; return acc; }, {});
  const patients = users.map((u) => ({ ...u, patientProfile: profileMap[u._id.toString()] || {} }));
  return res.status(200).json({ patients, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

// GET /api/patients/:id — doctor gets specific patient details
router.get('/:id', requireDoctor, async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash -refreshToken -resetToken -resetTokenExpiry').lean();
  if (!user || user.role !== 'patient') return res.status(404).json({ error: 'Patient not found' });
  const [profile, vitals, prescriptions] = await Promise.all([
    Patient.findOne({ userId: req.params.id }).lean(),
    Vital.find({ patientId: req.params.id }).sort({ recordedAt: -1 }).limit(5).lean(),
    Prescription.find({ patientId: req.params.id }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);
  return res.status(200).json({ ...user, patientProfile: profile || {}, recentVitals: vitals, recentPrescriptions: prescriptions });
});

export default router;
