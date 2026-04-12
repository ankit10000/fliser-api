import { connectDB } from '../../lib/db.js';
import { setCors, handleOptions } from '../../lib/cors.js';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  setCors(res);

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  await connectDB();

  const { id } = req.query;

  let objectId;
  try {
    objectId = new mongoose.Types.ObjectId(id);
  } catch {
    return res.status(400).json({ error: 'Invalid file id' });
  }

  const db = mongoose.connection.db;
  const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });

  const files = await bucket.find({ _id: objectId }).toArray();
  if (!files.length) return res.status(404).json({ error: 'File not found' });

  const file = files[0];
  res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);

  const downloadStream = bucket.openDownloadStream(objectId);
  downloadStream.pipe(res);
  downloadStream.on('error', () => res.status(500).json({ error: 'Error streaming file' }));
}
