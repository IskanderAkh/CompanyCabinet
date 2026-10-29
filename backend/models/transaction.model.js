import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' }, // снимок водителя на момент заправки
    station: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    date: { type: Date, required: true },
    gallons: Number,
    unitPrice: Number,
    amount: Number,
    fees: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

transactionSchema.index({ company: 1, date: -1 });
transactionSchema.index({ company: 1, driver: 1, date: -1 });
transactionSchema.index({ company: 1, card: 1, date: -1 });
transactionSchema.index({ invoice: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;