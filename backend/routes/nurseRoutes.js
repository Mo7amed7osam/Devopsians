import express from 'express';
import { updateReport, viewSchedule } from '../controllers/nurseController.js';

const router = express.Router();

router.post('/update-report', updateReport);
router.get('/view-schedule', viewSchedule);

export default router;
