import mongoose from 'mongoose';
import dayjsBase from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import { httpError } from './httpError.js';

dayjsBase.extend(utc);
export const dayjs = dayjsBase;

export const round2 = (n) => Math.round((n || 0) * 100) / 100;

export const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const pick = (obj, keys) =>
    Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

export const getPagination = (query) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    return { page, limit, skip: (page - 1) * limit };
};

export const toObjectId = (id, field = 'id') => {
    if (!mongoose.isValidObjectId(id)) throw httpError(400, `Некорректный ${field}`);
    return new mongoose.Types.ObjectId(id);
};

// ?from=2026-10-01&to=2026-10-29 → { $gte, $lte } по UTC
export const parseDateRange = (from, to) => {
    if (!from && !to) return null;
    const range = {};
    if (from) {
        const d = dayjs.utc(from);
        if (!d.isValid()) throw httpError(400, 'Некорректная дата from');
        range.$gte = d.startOf('day').toDate();
    }
    if (to) {
        const d = dayjs.utc(to);
        if (!d.isValid()) throw httpError(400, 'Некорректная дата to');
        range.$lte = d.endOf('day').toDate();
    }
    return range;
};