import mongoose from 'mongoose';

// Общий справочник станций — без company
const stationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    city: String,
    state: String,
    retailPrice: Number,
    discountPrice: Number,
  },
  { timestamps: true }
);

stationSchema.index({ state: 1 });

export default mongoose.model('Station', stationSchema);