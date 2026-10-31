import 'dotenv/config';
import path from 'path';
import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';

import apiRoutes from './apiRoutes.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());


app.use('/api', apiRoutes);
app.use('/api', notFound);

// В проде Express отдаёт собранный фронтенд
if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve('frontend', 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.use(errorHandler);

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✓ MongoDB подключена');
        app.listen(PORT, () => console.log(`✓ Сервер: http://localhost:${PORT}`));
    })
    .catch((err) => {
        console.error('✗ Не удалось подключиться к MongoDB:', err.message);
        process.exit(1);
    });