import { httpError } from '../utils/httpError.js';

export const notFound = (req, res, next) =>
  next(httpError(404, `Маршрут не найден: ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Ошибка сервера';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Некорректное значение поля ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    message = `Значение уже используется: ${Object.keys(err.keyValue).join(', ')}`;
  }

  if (status === 500) console.error(err);

  res.status(status).json({
    message,
    ...(process.env.NODE_ENV === 'development' && status === 500 && { stack: err.stack }),
  });
};
