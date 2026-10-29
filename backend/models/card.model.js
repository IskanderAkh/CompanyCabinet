import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    cardNumber: { type: String, required: true, unique: true },
    unitNumber: String,
    dailyLimit: { type: Number, default: 200 },
    usedToday: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'hold', 'blocked'], default: 'active' },
    lastUsedAt: Date,
  },
  { timestamps: true }
);

cardSchema.index({ company: 1, status: 1 });

export default mongoose.model('Card', cardSchema);