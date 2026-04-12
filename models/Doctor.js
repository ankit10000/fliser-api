import mongoose from 'mongoose';

const availabilitySchema = new mongoose.Schema({
  dayOfWeek: { type: Number, min: 0, max: 6 },
  startTime: { type: String },
  endTime: { type: String },
  slotDurationMinutes: { type: Number, default: 30 },
});

const doctorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    specialization: { type: String, default: 'general' },
    specification: { type: String, default: null },
    rating: { type: Number, default: () => +(Math.random() * 1.9 + 3).toFixed(1) },
    totalRatings: { type: Number, default: 0 },
    ratingSum: { type: Number, default: 0 },
    openHour: { type: String, default: '09:00' },
    closeHour: { type: String, default: '21:00' },
    consultationFee: { type: Number, default: 500 },
    yearsExperience: { type: Number, default: 0 },
    education: [{ type: String }],
    languages: [{ type: String }],
    isAvailable: { type: Boolean, default: true },
    availability: [availabilitySchema],
  },
  { timestamps: true }
);

export default mongoose.models.Doctor || mongoose.model('Doctor', doctorSchema);
