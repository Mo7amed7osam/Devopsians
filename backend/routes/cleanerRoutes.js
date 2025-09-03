import express from 'express';
import { markRoomAsCleaned, viewRoomsToBeCleaned } from '../controllers/cleanerController.js';

const router = express.Router();

router.get('/view-rooms-tobe-cleaned', viewRoomsToBeCleaned);
router.post('/mark-room-cleaned', markRoomAsCleaned);

export default router;
