import Driver from '../models/driver.model.js';
import Card from '../models/card.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { escapeRegex, getPagination, pick, toObjectId } from '../utils/query.js';

const EDITABLE = ['name', 'email', 'phone'];

// Добавляет каждому водителю список его карт (колонка «Карты аккаунта»)
const attachCards = async (company, drivers) => {
  const cards = await Card.find({ company, driver: { $in: drivers.map((d) => d._id) } })
    .select('cardNumber status driver')
    .lean();
  return drivers.map((d) => ({
    ...d,
    cards: cards.filter((c) => String(c.driver) === String(d._id)),
  }));
};

// GET /api/drivers?q=&page=&limit=
export const getDrivers = asyncHandler(async (req, res) => {
  const { company } = req.user;
  const { page, limit, skip } = getPagination(req.query);

  const filter = { company };
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }

  const [drivers, total] = await Promise.all([
    Driver.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Driver.countDocuments(filter),
  ]);

  res.json({ items: await attachCards(company, drivers), total, page, limit });
});

// GET /api/drivers/:id
export const getDriver = asyncHandler(async (req, res) => {
  const { company } = req.user;
  const driver = await Driver.findOne({ _id: toObjectId(req.params.id), company }).lean();
  if (!driver) throw httpError(404, 'Водитель не найден');

  const [withCards] = await attachCards(company, [driver]);
  res.json(withCards);
});

// POST /api/drivers
export const createDriver = asyncHandler(async (req, res) => {
  if (!req.body.name) throw httpError(400, 'Имя водителя обязательно');
  const driver = await Driver.create({ ...pick(req.body, EDITABLE), company: req.user.company });
  res.status(201).json(driver);
});

// PATCH /api/drivers/:id
export const updateDriver = asyncHandler(async (req, res) => {
  const driver = await Driver.findOneAndUpdate(
    { _id: toObjectId(req.params.id), company: req.user.company },
    pick(req.body, EDITABLE),
    { new: true, runValidators: true }
  );
  if (!driver) throw httpError(404, 'Водитель не найден');
  res.json(driver);
});

// DELETE /api/drivers/:id — карты отвязываются, история транзакций остаётся
export const deleteDriver = asyncHandler(async (req, res) => {
  const { company } = req.user;
  const id = toObjectId(req.params.id);

  const driver = await Driver.findOneAndDelete({ _id: id, company });
  if (!driver) throw httpError(404, 'Водитель не найден');

  await Card.updateMany({ company, driver: id }, { $unset: { driver: 1 } });
  res.json({ message: 'Водитель удалён' });
});
