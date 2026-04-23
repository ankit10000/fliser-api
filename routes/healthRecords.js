import { Router } from 'express';
import { requireAuth } from '../lib/middleware.js';
import HealthRecord from '../models/HealthRecord.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
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
});

router.post('/', requireAuth, async (req, res) => {
  const { patientId, title, category, description, fileId, fileUrl, date, tags } = req.body;
  const targetId = req.user.role === 'patient' ? req.user.id : patientId;
  if (!targetId) return res.status(400).json({ error: 'patientId required' });
  if (!title || !category) return res.status(400).json({ error: 'title and category required' });
  const record = await HealthRecord.create({
    patientId: targetId,
    uploadedBy: req.user.id,
    title,
    category,
    description: description || '',
    fileId: fileId || null,
    fileUrl: fileUrl || null,
    date: date ? new Date(date) : new Date(),
    tags: tags || [],
  });
  return res.status(201).json(record);
});

router.get('/:id', requireAuth, async (req, res) => {
  const record = await HealthRecord.findById(req.params.id).lean();
  if (!record) return res.status(404).json({ error: 'Not found' });
  if (record.patientId.toString() !== req.user.id && req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return res.status(200).json(record);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const record = await HealthRecord.findById(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  if (record.patientId.toString() !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  await HealthRecord.findByIdAndDelete(req.params.id);
  return res.status(200).json({ message: 'Deleted' });
});

export default router;
