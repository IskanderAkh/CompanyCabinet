import { Router } from 'express';
import { getInvoices, getInvoice } from '../controllers/invoice.controller.js';

const router = Router();

router.get('/', getInvoices);
router.get('/:id', getInvoice);

export default router;