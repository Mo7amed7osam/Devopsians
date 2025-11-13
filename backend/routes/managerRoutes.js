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
} from "../controllers/managerController.js";
import { isAuthenticated, authorizeRoles } from "../utils/authMiddleware.js";

const router = express.Router();

// Get manager's assigned hospital
router.get("/my-hospital", isAuthenticated, authorizeRoles("Manager"), getMyHospital);

// All manager routes require authentication and Manager role
router.post("/register-icu", isAuthenticated, authorizeRoles("Manager"), registerICU);
router.delete("/delete-icu/:icuId", isAuthenticated, authorizeRoles("Manager"), deleteICU);
router.put("/update-icu/:icuId", isAuthenticated, authorizeRoles("Manager"), updateICU);
router.get("/view-icus", isAuthenticated, authorizeRoles("Manager"), viewICUs);
router.get("/view-icu-byid/:icuId", isAuthenticated, authorizeRoles("Manager"), viewICUById);

export default router;
