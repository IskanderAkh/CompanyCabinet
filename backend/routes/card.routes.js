import { Router } from 'express';
import { getCards, getCard, updateCard } from '../controllers/card.controller.js';

const router = Router();

router.get('/', getCards);
router.route('/:id').get(getCard).patch(updateCard);

export default router;