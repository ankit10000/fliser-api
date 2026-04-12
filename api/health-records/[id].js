import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/middleware.js';
import HealthRecord from '../../models/HealthRecord.js';

async function handler(req, res) {
  await connectDB();
  const { id } = req.query;

  const record = await HealthRecord.findById(id);
  if (!record) return res.status(404).json({ error: 'Record not found' });

  const isOwner = record.patientId.toString() === req.user.id;
  const isUploader = record.uploadedBy.toString() === req.user.id;
  if (!isOwner && !isUploader && req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'GET') return res.status(200).json(record);

  if (req.method === 'DELETE') {
    if (!isOwner && !isUploader) return res.status(403).json({ error: 'Forbidden' });
    await HealthRecord.findByIdAndDelete(id);
    return res.status(200).json({ message: 'Record deleted' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
