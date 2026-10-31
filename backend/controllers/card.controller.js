import Card from '../models/card.model.js';
import Driver from '../models/driver.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { escapeRegex, getPagination, pick, toObjectId } from '../utils/query.js';

const DRIVER_FIELDS = 'name email phone';

// GET /api/cards?q=&status=&page=&limit=
export const getCards = asyncHandler(async (req, res) => {
  const { company } = req.user;
  const { page, limit, skip } = getPagination(req.query);
  const { q, status } = req.query;

  const filter = { company };
  if (status) filter.status = status;

  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    const drivers = await Driver.find({ company, name: rx }).select('_id').lean();
    filter.$or = [
      { cardNumber: rx },
      { unitNumber: rx },
      { driver: { $in: drivers.map((d) => d._id) } },
    ];
  }

  const [items, total] = await Promise.all([
    Card.find(filter)
      .populate('driver', DRIVER_FIELDS)
      .sort({ lastUsedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Card.countDocuments(filter),
  ]);

  res.json({ items, total, page, limit });
});

// GET /api/cards/:id
export const getCard = asyncHandler(async (req, res) => {
  const card = await Card.findOne({ _id: toObjectId(req.params.id), company: req.user.company })
    .populate('driver', DRIVER_FIELDS)
    .lean();
  if (!card) throw httpError(404, 'Карта не найдена');
  res.json(card);
});

// PATCH /api/cards/:id — лимит, статус, номер юнита, водитель (null — отвязать)
export const updateCard = asyncHandler(async (req, res) => {
  const { company } = req.user;
  const update = pick(req.body, ['dailyLimit', 'status', 'unitNumber']);

  if (update.dailyLimit !== undefined) {
    const limit = Number(update.dailyLimit);
    if (!Number.isFinite(limit) || limit < 0) throw httpError(400, 'Лимит должен быть числом ≥ 0');
    update.dailyLimit = limit;
  }

  const unset = {};
  if (req.body.driver === null) {
    unset.driver = 1;
  } else if (req.body.driver !== undefined) {
    const driverId = toObjectId(req.body.driver, 'driver');
    const driverExists = await Driver.exists({ _id: driverId, company });
    if (!driverExists) throw httpError(400, 'Водитель не найден в вашей компании');
    update.driver = driverId;
  }

  const card = await Card.findOneAndUpdate(
    { _id: toObjectId(req.params.id), company },
    { $set: update, ...(Object.keys(unset).length && { $unset: unset }) },
    { new: true, runValidators: true }
  ).populate('driver', DRIVER_FIELDS);

  if (!card) throw httpError(404, 'Карта не найдена');
  res.json(card);
});
