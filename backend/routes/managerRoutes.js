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
router.post("/assign-backup-manager", isAuthenticated, authorizeRoles("Admin", "Manager"), assignBackupManager);
router.post("/register-icu", isAuthenticated, authorizeRoles("Manager"), registerICU);
router.delete("/delete-icu/:icuId", isAuthenticated, authorizeRoles("Manager"), deleteICU);
router.put("/update-icu/:icuId", isAuthenticated, authorizeRoles("Manager"), updateICU);
router.get("/view-icus", isAuthenticated, authorizeRoles("Manager"), viewICUs);
router.post("/add-employee", isAuthenticated, authorizeRoles("Manager"), addEmployee);
router.delete("/remove-employee/:userId", isAuthenticated, authorizeRoles("Manager"), removeEmployee);
router.get("/track-employee-tasks", isAuthenticated, authorizeRoles("Manager"), trackEmployeeTasks);
router.post("/create-and-assign-task", isAuthenticated, authorizeRoles("Manager"), createAndAssignTask);
router.post("/register-visitor-room", isAuthenticated, authorizeRoles("Manager"), registerVisitorRoom);
router.get("/calculate-fees/:userId", isAuthenticated, authorizeRoles("Manager"), calculateFees);
router.get("/view-icu-byid/:icuId", isAuthenticated, authorizeRoles("Manager"), viewICUById);
router.get("/view-all-employees/:managerId", isAuthenticated, authorizeRoles("Manager"), viewAllEmployees);

export default router;
