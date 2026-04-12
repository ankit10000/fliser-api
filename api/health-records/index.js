import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/middleware.js';
import HealthRecord from '../../models/HealthRecord.js';

async function handler(req, res) {
  await connectDB();

  if (req.method === 'GET') {
    const { patientId, category, page = 1, limit = 20 } = req.query;
    const targetId = req.user.role === 'patient' ? req.user.id : patientId;
    if (!targetId) return res.status(400).json({ error: 'patientId required' });

    const filter = { patientId: targetId };
    if (category) filter.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      HealthRecord.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      HealthRecord.countDocuments(filter),
    ]);

    return res.status(200).json({ records, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  }

  if (req.method === 'POST') {
    const { patientId, title, category, description, date, fileId, fileUrl, tags } = req.body;
    const targetId = req.user.role === 'patient' ? req.user.id : patientId;
    if (!targetId || !title || !date) return res.status(400).json({ error: 'patientId, title, date are required' });

    const record = await HealthRecord.create({
      patientId: targetId,
      uploadedBy: req.user.id,
      title,
      category: category || 'other',
      description: description || '',
      fileId: fileId || null,
      fileUrl: fileUrl || null,
      date: new Date(date),
      tags: tags || [],
    });

    return res.status(201).json(record);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
