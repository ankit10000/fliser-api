import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/middleware.js';
import User from '../../models/User.js';
import Doctor from '../../models/Doctor.js';
import Patient from '../../models/Patient.js';

async function handler(req, res) {
  await connectDB();

  if (req.method === 'GET') {
    const user = await User.findById(req.user.id).select('-passwordHash -refreshToken -resetToken -resetTokenExpiry');
    if (!user) return res.status(404).json({ error: 'User not found' });

    let extra = {};
    if (user.role === 'doctor') {
      const doc = await Doctor.findOne({ userId: user._id });
      if (doc) extra = { doctorProfile: doc };
    } else {
      const pat = await Patient.findOne({ userId: user._id });
      if (pat) extra = { patientProfile: pat };
    }

    return res.status(200).json({ ...user.toObject(), ...extra });
  }

  if (req.method === 'PUT') {
    const allowed = ['name', 'phone', 'address', 'birthDate', 'bio', 'profilePhoto'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-passwordHash -refreshToken -resetToken -resetTokenExpiry');

    if (user.role === 'doctor' && req.body.doctorProfile) {
      const docAllowed = ['specialization', 'specification', 'openHour', 'closeHour', 'consultationFee', 'yearsExperience', 'education', 'languages', 'isAvailable'];
      const docUpdates = {};
      for (const key of docAllowed) {
        if (req.body.doctorProfile[key] !== undefined) docUpdates[key] = req.body.doctorProfile[key];
      }
      await Doctor.findOneAndUpdate({ userId: user._id }, docUpdates);
    }

    if (user.role === 'patient' && req.body.patientProfile) {
      const patAllowed = ['bloodGroup', 'allergies', 'chronicConditions', 'emergencyContactName', 'emergencyContactPhone', 'insuranceProvider', 'insuranceId', 'height', 'weight'];
      const patUpdates = {};
      for (const key of patAllowed) {
        if (req.body.patientProfile[key] !== undefined) patUpdates[key] = req.body.patientProfile[key];
      }
      await Patient.findOneAndUpdate({ userId: user._id }, patUpdates);
    }

    return res.status(200).json(user);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
