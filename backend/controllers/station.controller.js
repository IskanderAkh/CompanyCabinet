import Station from '../models/station.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { escapeRegex, getPagination, toObjectId } from '../utils/query.js';

const SORTS = {
  savings: { savings: -1 },
  price: { discountPrice: 1 },
  name: { name: 1 },
};

// GET /api/stations?state=&q=&sort=savings|price|name&page=&limit=
export const getStations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { state, q, sort = 'savings' } = req.query;

  const match = {};
  if (state) match.state = String(state).toUpperCase();
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    match.$or = [{ name: rx }, { city: rx }];
  }

  const [result] = await Station.aggregate([
    { $match: match },
    { $addFields: { savings: { $round: [{ $subtract: ['$retailPrice', '$discountPrice'] }, 2] } } },
    { $sort: SORTS[sort] || SORTS.savings },
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  res.json({ items: result.items, total: result.total[0]?.count || 0, page, limit });
});

// GET /api/stations/:id
export const getStation = asyncHandler(async (req, res) => {
  const station = await Station.findById(toObjectId(req.params.id)).lean();
  if (!station) throw httpError(404, 'Станция не найдена');
  res.json(station);
});
