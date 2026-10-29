import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true },
    email: String,
    phone: String,
  },
  { timestamps: true }
);

driverSchema.index({ company: 1, name: 1 });

const Driver = mongoose.model('Driver', driverSchema);
export default Driver;
