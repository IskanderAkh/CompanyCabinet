import Invoice from '../models/invoice.model.js';
import Transaction from '../models/transaction.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { getPagination, parseDateRange, toObjectId } from '../utils/query.js';

// GET /api/invoices?from=&to=&status=&page=&limit=
export const getInvoices = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { from, to, status } = req.query;

  const filter = { company: req.user.company };
  if (status) filter.status = status;

  // Счёт попадает в выборку, если его период пересекается с выбранным
  const range = parseDateRange(from, to);
  if (range?.$gte) filter.periodTo = { $gte: range.$gte };
  if (range?.$lte) filter.periodFrom = { $lte: range.$lte };

  const [items, total] = await Promise.all([
    Invoice.find(filter).sort({ periodFrom: -1 }).skip(skip).limit(limit).lean(),
    Invoice.countDocuments(filter),
  ]);

  res.json({ items, total, page, limit });
});

// GET /api/invoices/:id — счёт вместе с его транзакциями
export const getInvoice = asyncHandler(async (req, res) => {
  const { company } = req.user;
  const id = toObjectId(req.params.id);

  const invoice = await Invoice.findOne({ _id: id, company }).lean();
  if (!invoice) throw httpError(404, 'Счёт не найден');

  const transactions = await Transaction.find({ company, invoice: id })
    .populate('card', 'cardNumber')
    .populate('driver', 'name')
    .populate('station', 'name city state')
    .sort({ date: -1 })
    .lean();

  res.json({ ...invoice, transactions });
});
