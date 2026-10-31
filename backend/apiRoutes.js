import { Router } from 'express';
import { protectRoute } from './middleware/auth.middleware.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import companyRoutes from './routes/company.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import driverRoutes from './routes/driver.routes.js';
import cardRoutes from './routes/card.routes.js';
import stationRoutes from './routes/station.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';

const router = Router();

router.use('/auth', authRoutes);

router.use(protectRoute);

router.use('/users', userRoutes);
router.use('/company', companyRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/transactions', transactionRoutes);
router.use('/drivers', driverRoutes);
router.use('/cards', cardRoutes);
router.use('/stations', stationRoutes);
router.use('/invoices', invoiceRoutes);

export default router;