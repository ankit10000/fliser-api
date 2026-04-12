import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/middleware.js';
import Prescription from '../../models/Prescription.js';

async function handler(req, res) {
  await connectDB();
  const { id } = req.query;

  const rx = await Prescription.findById(id);
  if (!rx) return res.status(404).json({ error: 'Prescription not found' });

  const isDoctor = rx.doctorId.toString() === req.user.id;
  const isPatient = rx.patientId.toString() === req.user.id;
  if (!isDoctor && !isPatient) return res.status(403).json({ error: 'Forbidden' });

  if (req.method === 'GET') return res.status(200).json(rx);

  if (req.method === 'PUT') {
    if (!isDoctor) return res.status(403).json({ error: 'Only the prescribing doctor can edit' });

    const hoursSinceCreation = (Date.now() - rx.createdAt.getTime()) / 3600000;
    if (hoursSinceCreation > 24) return res.status(400).json({ error: 'Cannot edit prescription after 24 hours' });

    const allowed = ['diagnosis', 'medicines', 'notes', 'validUntil'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const updated = await Prescription.findByIdAndUpdate(id, updates, { new: true });
    return res.status(200).json(updated);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
