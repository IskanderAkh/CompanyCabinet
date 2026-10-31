import { Router } from 'express';
import { getTransactions, exportTransactions } from '../controllers/transaction.controller.js';

const router = Router();

router.get('/', getTransactions);
router.get('/export', exportTransactions);

export default router;