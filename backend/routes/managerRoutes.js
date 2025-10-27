import express from "express";
import {
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

const router = express.Router();

router.post("/assign-backup-manager", assignBackupManager);
router.post("/register-icu", registerICU);
router.delete("/delete-icu/:icuId", deleteICU);
router.put("/update-icu/:icuId", updateICU);
router.get("/view-icus", viewICUs);
router.post("/add-employee", addEmployee);
router.delete("/remove-employee/:userId", removeEmployee);
router.get("/track-employee-tasks", trackEmployeeTasks);
router.post("/create-and-assign-task", createAndAssignTask);
router.post("/register-visitor-room", registerVisitorRoom);
router.get("/calculate-fees/:userId", calculateFees);
router.get("/view-icu-byid/:icuId", viewICUById);

router.get("/view-all-employees/:managerId", viewAllEmployees);

export default router;
