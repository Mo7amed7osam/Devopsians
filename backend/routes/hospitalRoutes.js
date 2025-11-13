import express from 'express';
import { addHospital , blockHospital, viewHospitals, assignManager, unblockHospital, deleteHospital, viewNearbyHospitalsPublic } from '../controllers/adminController.js';
import { isAuthenticated, authorizeRoles } from '../utils/authMiddleware.js';

const router = express.Router();

// Public route - Get nearby hospitals without authentication (for map feature)
router.get('/nearby', viewNearbyHospitalsPublic);

// Add a hospital - Admin only
router.post('/add-hospital', isAuthenticated, authorizeRoles('Admin'), addHospital);

// Block/unblock a hospital - Admin only
router.put('/block-hospital/:id', isAuthenticated, authorizeRoles('Admin'), blockHospital);
router.put('/unblock-hospital/:id', isAuthenticated, authorizeRoles('Admin'), unblockHospital);

// View hospitals - Admin and Manager can view
router.get('/view-hospitals', isAuthenticated, authorizeRoles('Admin', 'Manager'), viewHospitals);

// Assign manager to a hospital - Admin only
router.put('/assign-manager/:id', isAuthenticated, authorizeRoles('Admin'), assignManager);

// Delete hospital - Admin only
router.delete('/delete-hospital/:id', isAuthenticated, authorizeRoles('Admin'), deleteHospital);

export default router;
