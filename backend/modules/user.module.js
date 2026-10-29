import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['owner', 'manager'], default: 'owner' },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);