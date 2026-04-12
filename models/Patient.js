import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bloodGroup: { type: String, default: null },
    allergies: [{ type: String }],
    chronicConditions: [{ type: String }],
    emergencyContactName: { type: String, default: null },
    emergencyContactPhone: { type: String, default: null },
    insuranceProvider: { type: String, default: null },
    insuranceId: { type: String, default: null },
    height: { type: Number, default: null },
    weight: { type: Number, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Patient || mongoose.model('Patient', patientSchema);
