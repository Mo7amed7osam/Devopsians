import express from 'express';
import { 
    reserveICU, 
    calculateFee, 
    checkInPatient, 
    checkOutPatient, 
    getICURequests 
} from '../controllers/receptionistController.js';
import { isAuthenticated, authorizeRoles } from '../utils/authMiddleware.js';

const router = express.Router();

// Get all ICU requests (reserved ICUs)
router.get('/icu-requests', isAuthenticated, authorizeRoles('Admin', 'Manager', 'Receptionist'), getICURequests);

// Reserve ICU for patient
router.post('/reserve-icu', isAuthenticated, authorizeRoles('Admin', 'Manager', 'Receptionist'), reserveICU);

// Check-in patient to ICU
router.post('/check-in', isAuthenticated, authorizeRoles('Admin', 'Manager', 'Receptionist'), checkInPatient);

// Check-out patient from ICU (discharge)
router.post('/check-out', isAuthenticated, authorizeRoles('Admin', 'Manager', 'Receptionist'), checkOutPatient);

// Calculate patient fees
router.get('/calculate-fee', isAuthenticated, authorizeRoles('Admin', 'Manager', 'Receptionist'), calculateFee);

export default router;
