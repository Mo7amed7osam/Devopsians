import express from "express";
import {
    viewPatientHealthStatus,
    viewPatientMedicalHistory,
    updatePatientMedicineSchedule,
    viewAllAssignedPatients,
} from "../controllers/doctorController.js";

const router = express.Router();

router.get("/view-health-status/doctor/:doctorId/patient/:patientId", viewPatientHealthStatus);
router.get("/view-medical-history/doctor/:doctorId/patient/:patientId", viewPatientMedicalHistory);
router.put("/update-medicine-schedule/doctor/:doctorId/patient/:patientId", updatePatientMedicineSchedule);
router.get("/assigned-patients/doctor/:doctorId/", viewAllAssignedPatients);

export default router;
