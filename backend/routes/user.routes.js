import { Router } from 'express';
import { updateProfile, changePassword } from '../controllers/user.controller.js';

const router = Router();

router.patch('/me', updateProfile);
router.patch('/me/password', changePassword);

export default router;