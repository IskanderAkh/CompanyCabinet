import { Router } from 'express';
import {
  getDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
} from '../controllers/driver.controller.js';

const router = Router();

router.route('/').get(getDrivers).post(createDriver);
router.route('/:id').get(getDriver).patch(updateDriver).delete(deleteDriver);

export default router;