import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';

export const protectRoute = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) throw httpError(401, 'Не авторизован');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw httpError(401, 'Сессия истекла, войдите снова');
  }

  const user = await User.findById(payload.id).select('-password');
  if (!user) throw httpError(401, 'Пользователь не найден');

  req.user = user;
  next();
});