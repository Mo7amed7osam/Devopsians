import express from "express";
import {
  getMyHospital,
  assignBackupManager,
  registerICU,
  deleteICU,
  updateICU,
  viewICUs,
  addEmployee,
  removeEmployee,
  trackEmployeeTasks,
  createAndAssignTask,
  registerVisitorRoom,
  calculateFees,
  viewAllEmployees,
  viewICUById,
  createReceptionist,
  getReceptionists,
  getReceptionistById,
  updateReceptionist,
  deleteReceptionist,
} from "../controllers/managerController.js";
import { isAuthenticated, authorizeRoles } from "../utils/authMiddleware.js";

const router = express.Router();

// Get manager's assigned hospital
router.get("/my-hospital", isAuthenticated, authorizeRoles("Manager"), getMyHospital);

// Receptionist CRUD routes
router.post("/create-receptionist", isAuthenticated, authorizeRoles("Manager"), createReceptionist);
router.get("/receptionists", isAuthenticated, authorizeRoles("Manager"), getReceptionists);
router.get("/receptionist/:receptionistId", isAuthenticated, authorizeRoles("Manager"), getReceptionistById);
router.put("/receptionist/:receptionistId", isAuthenticated, authorizeRoles("Manager"), updateReceptionist);
router.delete("/receptionist/:receptionistId", isAuthenticated, authorizeRoles("Manager"), deleteReceptionist);

// All manager routes require authentication and Manager role
router.post("/register-icu", isAuthenticated, authorizeRoles("Manager"), registerICU);
router.delete("/delete-icu/:icuId", isAuthenticated, authorizeRoles("Manager"), deleteICU);
router.put("/update-icu/:icuId", isAuthenticated, authorizeRoles("Manager"), updateICU);
router.get("/view-icus", isAuthenticated, authorizeRoles("Manager"), viewICUs);
router.get("/view-icu-byid/:icuId", isAuthenticated, authorizeRoles("Manager"), viewICUById);

export default router;
