import express from 'express';
import {
    getAllICUs,
    getICUById,
    reserveICU,
    cancelReservation,
    getAvailableICUs
} from '../controllers/icuController.js';

const router = express.Router();

// Get all ICUs
router.get('/all', getAllICUs);

// Get available ICUs only
router.get('/available', getAvailableICUs);

// Get ICU by ID
router.get('/:id', getICUById);

// Reserve an ICU
router.post('/reserve', reserveICU);

// Cancel reservation
router.post('/cancel', cancelReservation);

export default router;
