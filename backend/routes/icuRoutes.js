import express from 'express';
import {
    getAllICUs,
    getICUById,
    reserveICU,
    cancelReservation,
    getAvailableICUs
} from '../controllers/icuController.js';
import { isAuthenticated, authorizeRoles } from '../utils/authMiddleware.js';

const router = express.Router();

// Get available ICUs only - public endpoint (no authentication required for browsing)
router.get('/available', getAvailableICUs);

// Get all ICUs - restricted to staff roles
router.get('/all', isAuthenticated, authorizeRoles('Admin', 'Manager', 'Receptionist'), getAllICUs);

// Get ICU by ID
router.get('/:id', isAuthenticated, authorizeRoles('Admin', 'Manager', 'Receptionist', 'Patient'), getICUById);

// Reserve an ICU - allow patients, receptionist, manager, admin
router.post('/reserve', isAuthenticated, authorizeRoles('Admin', 'Manager', 'Receptionist', 'Patient'), reserveICU);

// Cancel reservation - allow patients, receptionist, manager, admin
router.post('/cancel', isAuthenticated, authorizeRoles('Admin', 'Manager', 'Receptionist', 'Patient'), cancelReservation);

export default router;
