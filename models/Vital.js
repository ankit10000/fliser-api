import mongoose from 'mongoose';

const vitalSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bloodPressureSystolic: { type: Number, default: null },
    bloodPressureDiastolic: { type: Number, default: null },
    heartRate: { type: Number, default: null },
    temperature: { type: Number, default: null },
    oxygenSaturation: { type: Number, default: null },
    bloodSugar: { type: Number, default: null },
    weight: { type: Number, default: null },
    height: { type: Number, default: null },
    notes: { type: String, default: '' },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

vitalSchema.index({ patientId: 1, recordedAt: -1 });

export default mongoose.models.Vital || mongoose.model('Vital', vitalSchema);
