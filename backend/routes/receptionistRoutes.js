import express from 'express';
import { reserveICU, calculateFee } from '../controllers/receptionistController.js';

const router = express.Router();

router.post('/reserve-icu', reserveICU);
router.get('/calculate-fee', calculateFee);

export default router;
