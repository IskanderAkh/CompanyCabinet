import bcrypt from 'bcryptjs';
import User from '../modules/user.module.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';

// PATCH /api/users/me — имя и email владельца
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  const update = {};

  if (name !== undefined) {
    if (!name.trim()) throw httpError(400, 'Имя не может быть пустым');
    update.name = name.trim();
  }

  if (email !== undefined) {
    const normalized = email.trim().toLowerCase();
    const taken = await User.exists({ email: normalized, _id: { $ne: req.user._id } });
    if (taken) throw httpError(409, 'Этот email уже используется');
    update.email = normalized;
  }

  const user = await User.findByIdAndUpdate(req.user._id, update, {
    new: true,
    runValidators: true,
  })
    .select('-password')
    .populate('company', 'name logo');

  res.json(user);
});

// PATCH /api/users/me/password — смена пароля
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw httpError(400, 'Введите текущий и новый пароль');
  if (newPassword.length < 6) throw httpError(400, 'Новый пароль должен быть не короче 6 символов');

  // в req.user пароля нет (select('-password') в protect), поэтому загружаем заново
  const user = await User.findById(req.user._id);
  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) throw httpError(400, 'Текущий пароль неверный');

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ message: 'Пароль изменён' });
});