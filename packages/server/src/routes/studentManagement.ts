import { Router } from 'express';
import authenticateFirebase from '../middlewares/authenticateFirebase';
import {
  getStudentsHandler,
  createStudentHandler,
  updateStudentHandler,
  deleteStudentHandler,
  getStudentHandler,
} from '../controllers/studentManagementController';

const router = Router();

// All routes require authentication
router.use(authenticateFirebase);

// Student CRUD routes
router.get('/students', getStudentsHandler);
router.post('/students', createStudentHandler);
router.get('/students/:studentUserId', getStudentHandler);
router.put('/students/:studentUserId', updateStudentHandler);
router.delete('/students/:studentUserId', deleteStudentHandler);

export default router;
