import { Router } from 'express';
import { requireAuth } from '../lib/middleware.js';
import mongoose from 'mongoose';
import { Readable } from 'stream';

const router = Router();

function getBucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
}

router.post('/upload', requireAuth, async (req, res) => {
  const contentType = req.headers['content-type'] || 'application/octet-stream';
  const filename = req.headers['x-filename'] || `upload_${Date.now()}`;

  const bucket = getBucket();
  const uploadStream = bucket.openUploadStream(filename, { contentType, metadata: { uploadedBy: req.user.id } });

  req.pipe(uploadStream);
  uploadStream.on('error', () => res.status(500).json({ error: 'Upload failed' }));
  uploadStream.on('finish', () => {
    return res.status(201).json({ fileId: uploadStream.id.toString(), fileUrl: `/api/files/${uploadStream.id}`, filename });
  });
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const bucket = getBucket();
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files.length) return res.status(404).json({ error: 'File not found' });
    res.setHeader('Content-Type', files[0].contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${files[0].filename}"`);
    bucket.openDownloadStream(fileId).pipe(res);
  } catch {
    return res.status(400).json({ error: 'Invalid file id' });
  }
});

export default router;
