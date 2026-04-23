import express from 'express';
import { connectDB } from '../lib/db.js';
import authRouter from '../routes/auth.js';
import usersRouter from '../routes/users.js';
import doctorsRouter from '../routes/doctors.js';
import patientsRouter from '../routes/patients.js';
import appointmentsRouter from '../routes/appointments.js';
import messagesRouter from '../routes/messages.js';
import prescriptionsRouter from '../routes/prescriptions.js';
import vitalsRouter from '../routes/vitals.js';
import healthRecordsRouter from '../routes/healthRecords.js';
import dashboardRouter from '../routes/dashboard.js';
import filesRouter from '../routes/files.js';

const app = express();

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,X-Filename');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use(express.json({ limit: '10mb' }));

// Connect DB before handling requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Database connection failed' });
  }
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/doctors', doctorsRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/prescriptions', prescriptionsRouter);
app.use('/api/vitals', vitalsRouter);
app.use('/api/health-records', healthRecordsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/files', filesRouter);

app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use((req, res) => {
  return res.status(404).json({ error: 'Route not found', method: req.method, path: req.originalUrl });
});

app.use((err, req, res, next) => {
  console.error('[ERROR]', err?.message || err, err?.stack);
  if (err?.type === 'entity.parse.failed')
    return res.status(400).json({ error: 'Invalid JSON body' });
  return res.status(500).json({ error: 'Internal server error' });
});

export default app;
