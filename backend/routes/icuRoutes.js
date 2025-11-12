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

// Get all ICUs - restricted to staff roles
router.get('/all', isAuthenticated, authorizeRoles('Admin', 'Manager', 'Receptionist'), getAllICUs);

// Get available ICUs only - allow patients and staff
router.get('/available', isAuthenticated, authorizeRoles('Admin', 'Manager', 'Receptionist', 'Patient'), getAvailableICUs);

// Get ICU by ID
router.get('/:id', isAuthenticated, authorizeRoles('Admin', 'Manager', 'Receptionist', 'Patient'), getICUById);

// Reserve an ICU - only receptionist, manager, admin
router.post('/reserve', isAuthenticated, authorizeRoles('Admin', 'Manager', 'Receptionist'), reserveICU);

// Cancel reservation - only receptionist, manager, admin
router.post('/cancel', isAuthenticated, authorizeRoles('Admin', 'Manager', 'Receptionist'), cancelReservation);

export default router;
