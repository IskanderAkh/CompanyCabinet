import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    number: { type: String, required: true, unique: true },
    periodFrom: Date,
    periodTo: Date,
    status: { type: String, enum: ['paid', 'unpaid', 'overdue'], default: 'unpaid' },
    totalAmount: Number,
    totalDiscount: Number,
    unpaidAmount: Number,
    gallons: Number,
  },
  { timestamps: true }
);

invoiceSchema.index({ company: 1, periodFrom: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;