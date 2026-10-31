import { Router } from 'express';
import { getMyCompany, updateMyCompany } from '../controllers/company.controller.js';

const router = Router();

router.get('/', getMyCompany);
router.patch('/', updateMyCompany);

export default router;