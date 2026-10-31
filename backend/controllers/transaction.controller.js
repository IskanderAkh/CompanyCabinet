import Transaction from '../models/transaction.model.js';
import Card from '../models/card.model.js';
import Driver from '../models/driver.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { dayjs, escapeRegex, getPagination, parseDateRange, round2, toObjectId } from '../utils/query.js';

const EXPORT_LIMIT = 10000;

// Общий фильтр для списка и экспорта
// ?from=&to=&driverId=&cardId=&cardStatus=&q=
const buildFilter = async (req) => {
  const { company } = req.user;
  const { from, to, driverId, cardId, cardStatus, q } = req.query;

  const filter = { company };
  const and = [];

  const date = parseDateRange(from, to);
  if (date) filter.date = date;
  if (driverId) filter.driver = toObjectId(driverId, 'driverId');
  if (cardId) filter.card = toObjectId(cardId, 'cardId');

  if (cardStatus) {
    const cards = await Card.find({ company, status: cardStatus }).select('_id').lean();
    and.push({ card: { $in: cards.map((c) => c._id) } });
  }

  // Поиск по номеру карты, номеру юнита или имени водителя
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    const [cards, drivers] = await Promise.all([
      Card.find({ company, $or: [{ cardNumber: rx }, { unitNumber: rx }] }).select('_id').lean(),
      Driver.find({ company, name: rx }).select('_id').lean(),
    ]);
    and.push({
      $or: [{ card: { $in: cards.map((c) => c._id) } }, { driver: { $in: drivers.map((d) => d._id) } }],
    });
  }

  if (and.length) filter.$and = and;
  return filter;
};

const findWithRefs = (filter) =>
  Transaction.find(filter)
    .populate('card', 'cardNumber status unitNumber')
    .populate('driver', 'name')
    .populate('station', 'name city state')
    .sort({ date: -1 });

// GET /api/transactions
export const getTransactions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = await buildFilter(req);

  const [items, total, [totals]] = await Promise.all([
    findWithRefs(filter).skip(skip).limit(limit).lean(),
    Transaction.countDocuments(filter),
    Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          amount: { $sum: '$amount' },
          discount: { $sum: '$discount' },
          gallons: { $sum: '$gallons' },
          fees: { $sum: '$fees' },
        },
      },
    ]),
  ]);

  const summary = {
    totalAmount: round2(totals?.amount),
    totalDiscount: round2(totals?.discount),
    totalGallons: round2(totals?.gallons),
    totalFees: round2(totals?.fees),
    avgUnitPrice: totals?.gallons ? round2(totals.amount / totals.gallons) : 0,
  };

  res.json({ items, total, page, limit, summary });
});

const csvCell = (value) => {
  const s = value === undefined || value === null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// GET /api/transactions/export — CSV с теми же фильтрами
export const exportTransactions = asyncHandler(async (req, res) => {
  const filter = await buildFilter(req);
  const items = await findWithRefs(filter).limit(EXPORT_LIMIT).lean();

  const header = [
    'Date', 'Amount', 'Card number', 'Driver', 'Gallons', 'Unit price',
    'Fees', 'Discount', 'State', 'City', 'Location',
  ];
  const rows = items.map((t) => [
    dayjs.utc(t.date).format('MM/DD/YYYY'),
    t.amount,
    t.card?.cardNumber,
    t.driver?.name,
    t.gallons,
    t.unitPrice,
    t.fees,
    t.discount,
    t.station?.state,
    t.station?.city,
    t.station?.name,
  ]);

  const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="transactions-${dayjs().format('YYYY-MM-DD')}.csv"`
  );
  res.send('\uFEFF' + csv); // BOM, чтобы Excel правильно открыл UTF-8
});
