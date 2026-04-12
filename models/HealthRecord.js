import mongoose from 'mongoose';

const healthRecordSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ['lab_report', 'imaging', 'prescription', 'vaccination', 'allergy', 'surgery', 'other'],
      default: 'other',
    },
    description: { type: String, default: '' },
    fileId: { type: mongoose.Schema.Types.ObjectId, default: null },
    fileUrl: { type: String, default: null },
    date: { type: Date, required: true },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

healthRecordSchema.index({ patientId: 1, date: -1 });

export default mongoose.models.HealthRecord || mongoose.model('HealthRecord', healthRecordSchema);
