import Transaction from '../models/transaction.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { dayjs, round2, toObjectId } from '../utils/query.js';

const PERIODS = { '7d': 7, '30d': 30, '90d': 90 };
const TOP_STATIONS = 10;
const RECENT = 5;

// GET /api/dashboard?period=7d|30d|90d&driverId=
export const getDashboard = asyncHandler(async (req, res) => {
  const { company } = req.user;
  const days = PERIODS[req.query.period] || PERIODS['7d'];

  const start = dayjs.utc().subtract(days - 1, 'day').startOf('day');
  const end = dayjs.utc().endOf('day');

  const match = { company, date: { $gte: start.toDate(), $lte: end.toDate() } };
  if (req.query.driverId) match.driver = toObjectId(req.query.driverId, 'driverId');

  const [[totals], daily, stations, recent] = await Promise.all([
    // KPI-карточки
    Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          saved: { $sum: '$discount' },
          spent: { $sum: '$amount' },
          gallons: { $sum: '$gallons' },
        },
      },
    ]),

    // График по дням
    Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          spent: { $sum: '$amount' },
          saved: { $sum: '$discount' },
        },
      },
    ]),

    // Расходы по станциям
    Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$station',
          gallons: { $sum: '$gallons' },
          saved: { $sum: '$discount' },
          spent: { $sum: '$amount' },
          visits: { $sum: 1 },
        },
      },
      { $sort: { gallons: -1 } },
      { $limit: TOP_STATIONS },
      { $lookup: { from: 'stations', localField: '_id', foreignField: '_id', as: 'station' } },
      { $unwind: '$station' },
      {
        $project: {
          _id: 0,
          stationId: '$_id',
          name: '$station.name',
          city: '$station.city',
          state: '$station.state',
          gallons: { $round: ['$gallons', 2] },
          saved: { $round: ['$saved', 2] },
          spent: { $round: ['$spent', 2] },
          visits: 1,
        },
      },
    ]),

    // Последние транзакции
    Transaction.find(match)
      .populate('card', 'cardNumber')
      .populate('station', 'name')
      .sort({ date: -1 })
      .limit(RECENT)
      .lean(),
  ]);

  // Заполняем пустые дни нулями, чтобы на графике не было разрывов
  const byDay = Object.fromEntries(daily.map((d) => [d._id, d]));
  const chart = Array.from({ length: days }, (_, i) => {
    const key = start.add(i, 'day').format('YYYY-MM-DD');
    return { date: key, spent: round2(byDay[key]?.spent), saved: round2(byDay[key]?.saved) };
  });

  res.json({
    period: { from: start.toDate(), to: end.toDate() },
    kpi: {
      saved: round2(totals?.saved),
      spent: round2(totals?.spent),
      gallons: round2(totals?.gallons),
    },
    chart,
    stations: stations.map((s, i) => ({ ...s, popular: i === 0 })),
    recent,
  });
});
