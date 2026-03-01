import { Router } from 'express';
import authenticateFirebase from '../middlewares/authenticateFirebase';
import {
  getScheduleSlotsHandler,
  createScheduleSlotHandler,
  updateScheduleSlotHandler,
  deleteScheduleSlotHandler,
  getScheduleSlotHandler,
} from '../controllers/scheduleManagementController';

const router = Router();

// All routes require authentication
router.use(authenticateFirebase);

// Schedule slot CRUD routes
router.get('/schedules', getScheduleSlotsHandler);
router.post('/schedules', createScheduleSlotHandler);
router.get('/schedules/:scheduleSlotId', getScheduleSlotHandler);
router.put('/schedules/:scheduleSlotId', updateScheduleSlotHandler);
router.delete('/schedules/:scheduleSlotId', deleteScheduleSlotHandler);

export default router;
