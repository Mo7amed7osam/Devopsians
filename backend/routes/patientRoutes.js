import express from "express";
import {
  getAvailableICUs,
  updateMedicalHistory,
  rateHospital,
  getMedicineSchedule,
  getTotalFees,
  reserveICU,
  freeICU,
  reserveVisitorRoom,
  reserveKidsArea,
  getUserReservedServices,
} from "../controllers/patientController.js";
import { isAuthenticated, authorizeRoles } from "../utils/authMiddleware.js";

const router = express.Router();

// All patient routes require authentication and Patient role
router.put("/medical-history", isAuthenticated, authorizeRoles("Patient"), updateMedicalHistory);
router.post("/rate-hospital", isAuthenticated, authorizeRoles("Patient"), rateHospital);
router.get("/total-fees/:userId", isAuthenticated, authorizeRoles("Patient"), getTotalFees);

router.post("/reserve-icu", isAuthenticated, authorizeRoles("Patient"), reserveICU);
router.post("/free-icu", isAuthenticated, authorizeRoles("Patient"), freeICU);
router.get("/get-available-icus", getAvailableICUs); // Public endpoint for finding ICUs

router.get("/reserved-services/:userId", isAuthenticated, authorizeRoles("Patient"), getUserReservedServices);

export default router;
