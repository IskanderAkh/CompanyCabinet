import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../modules/user.module.js';
import Company from '../modules/company.module.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
};
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const setTokenCookie = (res, user) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { ...COOKIE_BASE, maxAge: WEEK_MS });
};

const toPublicUser = async (user) => {
  await user.populate('company', 'name logo');
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    company: user.company,
  };
};

// POST /api/auth/register — создаёт компанию и её владельца
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, companyName } = req.body;

  if (!name || !email || !password || !companyName) {
    throw httpError(400, 'Заполните имя, email, пароль и название компании');
  }
  if (password.length < 6) throw httpError(400, 'Пароль должен быть не короче 6 символов');

  const exists = await User.exists({ email: email.toLowerCase() });
  if (exists) throw httpError(409, 'Пользователь с таким email уже существует');

  const company = await Company.create({ name: companyName });

  let user;
  try {
    user = await User.create({
      company: company._id,
      name,
      email,
      password: await bcrypt.hash(password, 10),
    });
  } catch (err) {
    await Company.deleteOne({ _id: company._id }); // не оставляем пустую компанию
    throw err;
  }

  setTokenCookie(res, user);
  res.status(201).json(await toPublicUser(user));
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw httpError(400, 'Введите email и пароль');

  const user = await User.findOne({ email: email.toLowerCase() });
  const ok = user && (await bcrypt.compare(password, user.password));
  if (!ok) throw httpError(401, 'Неверный email или пароль');

  setTokenCookie(res, user);
  res.json(await toPublicUser(user));
});

// POST /api/auth/logout
export const logout = (req, res) => {
  res.clearCookie('token', COOKIE_BASE);
  res.json({ message: 'Вы вышли из аккаунта' });
};

// GET /api/auth/me
export const me = asyncHandler(async (req, res) => {
  res.json(await toPublicUser(req.user));
});