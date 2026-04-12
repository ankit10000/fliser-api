import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/middleware.js';
import Patient from '../../models/Patient.js';
import User from '../../models/User.js';

async function handler(req, res) {
  await connectDB();

  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Patient access only' });
  }

  if (req.method === 'GET') {
    const [user, patient] = await Promise.all([
      User.findById(req.user.id).select('-passwordHash -refreshToken -resetToken -resetTokenExpiry').lean(),
      Patient.findOne({ userId: req.user.id }).lean(),
    ]);
    return res.status(200).json({ ...user, patientProfile: patient });
  }

  if (req.method === 'PUT') {
    const patAllowed = ['bloodGroup', 'allergies', 'chronicConditions', 'emergencyContactName', 'emergencyContactPhone', 'insuranceProvider', 'insuranceId', 'height', 'weight'];
    const updates = {};
    for (const key of patAllowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const patient = await Patient.findOneAndUpdate({ userId: req.user.id }, updates, { new: true });
    return res.status(200).json(patient);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
