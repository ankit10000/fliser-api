import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/middleware.js';
import mongoose from 'mongoose';
import { Readable } from 'stream';

async function handler(req, res) {
  await connectDB();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fileBase64, filename, mimetype } = req.body;
  if (!fileBase64 || !filename) {
    return res.status(400).json({ error: 'fileBase64 and filename are required' });
  }

  const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  const db = mongoose.connection.db;
  const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });

  const uploadStream = bucket.openUploadStream(filename, {
    contentType: mimetype || 'application/octet-stream',
    metadata: { uploadedBy: req.user.id },
  });

  const readable = Readable.from(buffer);
  readable.pipe(uploadStream);

  await new Promise((resolve, reject) => {
    uploadStream.on('finish', resolve);
    uploadStream.on('error', reject);
  });

  const fileUrl = `/api/files/${uploadStream.id}`;

  return res.status(201).json({
    fileId: uploadStream.id,
    fileUrl,
    filename,
  });
}

export default requireAuth(handler);
