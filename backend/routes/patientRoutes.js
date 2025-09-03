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

const router = express.Router();

router.put("/medical-history", updateMedicalHistory);
router.post("/rate-hospital", rateHospital);
router.get("/medicine-schedule/:userId", getMedicineSchedule);
router.get("/total-fees/:userId", getTotalFees);

router.post("/reserve-icu", reserveICU);
router.post("/free-icu", freeICU);
router.get("/get-available-icus", getAvailableICUs);

router.post("/reserve-visitor-room", reserveVisitorRoom);
router.post("/reserve-kids-area", reserveKidsArea);
router.get("/reserved-services/:userId", getUserReservedServices);

export default router;
