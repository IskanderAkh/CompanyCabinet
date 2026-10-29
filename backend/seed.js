import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import { faker } from '@faker-js/faker';

import Company from './models/company.model.js';
import User from './models/user.model.js';
import Driver from './models/driver.model.js';
import Card from './models/card.model.js';
import Station from './models/station.model.js';
import Transaction from './models/transaction.model.js';
import Invoice from './models/invoice.model.js';

// Настройки объёма данных
const DRIVERS = 15;
const STATIONS = 40;
const TRANSACTIONS = 800;
const DAYS = 90;
const INVOICE_PERIOD_DAYS = 7;

const round = (n) => Math.round(n * 100) / 100;
const BRANDS = ['LOVES', 'PILOT', 'TA', 'PETRO', 'FLYING J'];

async function seed() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Подключено к MongoDB');

    // 1. Очищаем коллекции
    await Promise.all([
        Company.deleteMany(),
        User.deleteMany(),
        Driver.deleteMany(),
        Card.deleteMany(),
        Station.deleteMany(),
        Transaction.deleteMany(),
        Invoice.deleteMany(),
    ]);
    console.log('✓ Старые данные удалены');

    // 2. Компания и её владелец
    const company = await Company.create({
        name: 'SOFIYA MEGA CORP',
        mcNumber: faker.string.numeric(6),
        dotNumber: faker.string.numeric(7),
        address: faker.location.streetAddress({ useFullAddress: true }),
        phone: faker.phone.number(),
    });

    await User.create({
        company: company._id,
        name: 'Demo Owner',
        email: 'demo@demo.com',
        password: await bcrypt.hash('demo123', 10),
        role: 'owner',
    });

    // 3. Водители
    const drivers = await Driver.insertMany(
        Array.from({ length: DRIVERS }, () => {
            const firstName = faker.person.firstName();
            const lastName = faker.person.lastName();
            return {
                company: company._id,
                name: `${firstName} ${lastName}`,
                email: faker.internet.email({ firstName, lastName }).toLowerCase(),
                phone: faker.phone.number(),
            };
        })
    );

    // 4. Карты — по одной на водителя
    const cards = await Card.insertMany(
        drivers.map((driver, i) => ({
            company: company._id,
            driver: driver._id,
            cardNumber: `7083050030500${457400 + i}`,
            unitNumber: String(faker.number.int({ min: 100, max: 999 })),
            dailyLimit: faker.helpers.arrayElement([150, 200, 250, 300]),
            status: faker.helpers.weightedArrayElement([
                { weight: 8, value: 'active' },
                { weight: 1, value: 'hold' },
                { weight: 1, value: 'blocked' },
            ]),
        }))
    );

    // 5. Заправки (общий справочник)
    const stations = await Station.insertMany(
        Array.from({ length: STATIONS }, () => {
            const retailPrice = faker.number.float({ min: 4.5, max: 6.5, fractionDigits: 2 });
            return {
                name: `${faker.helpers.arrayElement(BRANDS)} #${faker.number.int({ min: 100, max: 999 })} TRAVEL STOP`,
                city: faker.location.city().toUpperCase(),
                state: faker.location.state({ abbreviated: true }),
                retailPrice,
                discountPrice: round(retailPrice - faker.number.float({ min: 0.2, max: 0.9 })),
            };
        })
    );

    // 6. Транзакции
    const now = new Date();
    const transactions = Array.from({ length: TRANSACTIONS }, () => {
        const card = faker.helpers.arrayElement(cards);
        const station = faker.helpers.arrayElement(stations);

        // Чаще полный бак, иногда дозаправка на пару галлонов
        const gallons = faker.helpers.weightedArrayElement([
            { weight: 8, value: faker.number.float({ min: 80, max: 150, fractionDigits: 2 }) },
            { weight: 2, value: faker.number.float({ min: 2, max: 20, fractionDigits: 2 }) },
        ]);

        const unitPrice = station.retailPrice;
        // Скидка только от 20 галлонов
        const discount = gallons >= 20 ? round(gallons * (station.retailPrice - station.discountPrice)) : 0;

        return {
            company: company._id,
            card: card._id,
            driver: card.driver,
            station: station._id,
            date: faker.date.recent({ days: DAYS, refDate: now }),
            gallons,
            unitPrice,
            amount: round(gallons * unitPrice),
            discount,
        };
    }).sort((a, b) => a.date - b.date);

    await Transaction.insertMany(transactions);

    // Дата последнего использования карты
    const lastUsed = {};
    for (const t of transactions) lastUsed[t.card] = t.date;
    await Promise.all(
        cards.map((c) =>
            Card.updateOne(
                { _id: c._id },
                { lastUsedAt: lastUsed[c._id] ?? null, usedToday: faker.number.int({ min: 0, max: c.dailyLimit }) }
            )
        )
    );

    // 7. Счета — собираем из транзакций по периодам
    const invoices = [];
    let periodStart = dayjs(transactions[0].date).startOf('day');
    let counter = 457000;

    while (periodStart.isBefore(now)) {
        const periodEnd = periodStart.add(INVOICE_PERIOD_DAYS - 1, 'day').endOf('day');
        const inPeriod = transactions.filter(
            (t) => t.date >= periodStart.toDate() && t.date <= periodEnd.toDate()
        );

        if (inPeriod.length) {
            const totalAmount = round(inPeriod.reduce((s, t) => s + t.amount, 0));
            const isLast = periodEnd.isAfter(dayjs(now).subtract(INVOICE_PERIOD_DAYS, 'day'));
            invoices.push({
                company: company._id,
                number: `INV-${counter++}`,
                periodFrom: periodStart.toDate(),
                periodTo: periodEnd.toDate(),
                status: isLast ? 'unpaid' : 'paid',
                totalAmount,
                totalDiscount: round(inPeriod.reduce((s, t) => s + t.discount, 0)),
                unpaidAmount: isLast ? totalAmount : 0,
                gallons: round(inPeriod.reduce((s, t) => s + t.gallons, 0)),
            });
        }
        periodStart = periodEnd.add(1, 'day').startOf('day');
    }

    const savedInvoices = await Invoice.insertMany(invoices);

    // Привязываем транзакции к счетам
    await Promise.all(
        savedInvoices.map((inv) =>
            Transaction.updateMany(
                { company: company._id, date: { $gte: inv.periodFrom, $lte: inv.periodTo } },
                { invoice: inv._id }
            )
        )
    );

    console.log(`✓ Готово:
  компания: ${company.name}
  пользователь: demo@demo.com / demo123
  водители: ${drivers.length}
  карты: ${cards.length}
  заправки: ${stations.length}
  транзакции: ${transactions.length}
  счета: ${savedInvoices.length}`);
}

seed()
    .catch((err) => {
        console.error('✗ Ошибка сида:', err);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());