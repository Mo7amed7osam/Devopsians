import express from 'express';

import{
    createUser,
    loginUser,
    verifyToken,
    updateUser,
    updateMedicalDetails,
    showUserDetails,
    sendemail,
    getLiveLocations,
} from '../controllers/userController.js';
import { isAuthenticated, authorizeRoles } from '../utils/authMiddleware.js';

const router = express.Router();
router.post("/send-email", sendemail);
router.post('/create-user', createUser);
router.post('/login-user', loginUser);
// router.get("/verify-token", verifyToken);
router.post("/verify-token", verifyToken);
//router.put("/update-user", updateUser);
router.put("/:userId/update-medical-details", updateMedicalDetails);
router.get('/details/:userId', showUserDetails);
// Live locations polling endpoint (accessible to roles needing tracking)
router.get('/live-locations', isAuthenticated, authorizeRoles('Admin','Manager','Receptionist','Ambulance'), getLiveLocations);



export default router;
