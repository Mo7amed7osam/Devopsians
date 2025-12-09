import express from "express";
const router = express.Router();

import {
  addHospital,
  viewHospitals,
  deleteHospital,
  blockHospital,
  unblockHospital,
  createManagerAccount,
  createAdminAccount,
  createUser,
  assignManager,
  viewAllAdmins,
  viewAllManagers,
  searchManagerWithHospitals,
  searchHospitalWithFeedbacks,
  viewHospitalsRating,
  viewAnManager,
  updateUser,
  deleteUser,
  blockUser,
  unblockUser,
} from "../controllers/adminController.js";
import { isAuthenticated, authorizeRoles } from "../utils/authMiddleware.js";

// ALL admin routes require authentication and Admin role
router.post("/add-hospital", isAuthenticated, authorizeRoles("Admin"), addHospital);
router.put("/block-hospital/:id", isAuthenticated, authorizeRoles("Admin"), blockHospital);
router.get("/view-hospitals", isAuthenticated, authorizeRoles("Admin"), viewHospitals);
router.delete("/delete-hospital/:id", isAuthenticated, authorizeRoles("Admin"), deleteHospital);
router.post("/assign-manager", isAuthenticated, authorizeRoles("Admin"), assignManager);
router.put("/unblock-hospital/:id", isAuthenticated, authorizeRoles("Admin"), unblockHospital);
router.post("/create-manager-account", isAuthenticated, authorizeRoles("Admin"), createManagerAccount);
router.post("/create-admin-account", isAuthenticated, authorizeRoles("Admin"), createAdminAccount);
router.post("/create-user", isAuthenticated, authorizeRoles("Admin"), createUser);
router.get("/view-all-admins", isAuthenticated, authorizeRoles("Admin"), viewAllAdmins);
router.get("/view-all-managers", isAuthenticated, authorizeRoles("Admin"), viewAllManagers);
router.put('/update-user/:id', isAuthenticated, authorizeRoles("Admin"), updateUser);
router.delete('/delete-user/:id', isAuthenticated, authorizeRoles("Admin"), deleteUser);
router.put('/block-user/:id', isAuthenticated, authorizeRoles("Admin"), blockUser);
router.put('/unblock-user/:id', isAuthenticated, authorizeRoles("Admin"), unblockUser);
router.get("/search-manager-with-hospitals", isAuthenticated, authorizeRoles("Admin"), searchManagerWithHospitals);
router.get("/search-hospital-with-feedbacks/:hospitalId", isAuthenticated, authorizeRoles("Admin"), searchHospitalWithFeedbacks);
router.get("/view-an-managers/:id", isAuthenticated, authorizeRoles("Admin"), viewAnManager);
router.get("/view-hospitals-rating", isAuthenticated, authorizeRoles("Admin"), viewHospitalsRating);

export default router;
