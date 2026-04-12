import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  durationDays: { type: Number, required: true },
  instructions: { type: String, default: '' },
});

const prescriptionSchema = new mongoose.Schema(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorName: { type: String, required: true },
    patientName: { type: String, required: true },
    diagnosis: { type: String, required: true },
    medicines: [medicineSchema],
    notes: { type: String, default: '' },
    issuedDate: { type: Date, default: Date.now },
    validUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

prescriptionSchema.index({ patientId: 1, createdAt: -1 });
prescriptionSchema.index({ doctorId: 1, createdAt: -1 });

export default mongoose.models.Prescription || mongoose.model('Prescription', prescriptionSchema);
