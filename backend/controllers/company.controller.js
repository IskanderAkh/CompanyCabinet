import Company from '../models/company.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { pick } from '../utils/query.js';

const EDITABLE = ['name', 'logo', 'mcNumber', 'dotNumber', 'address', 'phone'];

// GET /api/company
export const getMyCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.user.company);
  if (!company) throw httpError(404, 'Компания не найдена');
  res.json(company);
});

// PATCH /api/company
export const updateMyCompany = asyncHandler(async (req, res) => {
  const company = await Company.findByIdAndUpdate(req.user.company, pick(req.body, EDITABLE), {
    new: true,
    runValidators: true,
  });
  if (!company) throw httpError(404, 'Компания не найдена');
  res.json(company);
});