import express from "express";
import {
  getAllAmbulances,
  getAmbulanceById,
  updateAmbulanceStatus,
  assignAmbulance,
  acceptPickup,
  markPatientArrived,
  approvePickupRequest,
  rejectPickupRequest,
  createAmbulanceRequest,
  getActiveRequests,
  acceptAmbulanceRequest,
  cancelAmbulanceRequest,
  getMyAmbulanceRequest,
  getMyAcceptedRequest,
} from "../controllers/ambulanceController.js";
import { isAuthenticated, authorizeRoles } from "../utils/authMiddleware.js";

const router = express.Router();

// ========== New Ambulance Request System Routes (MUST come before /:ambulanceId) ==========

// Patient creates ambulance request
router.post(
  "/request",
  isAuthenticated,
  authorizeRoles("Patient"),
  createAmbulanceRequest
);

// Ambulance users get all active requests (sorted by distance)
router.get(
  "/requests",
  isAuthenticated,
  authorizeRoles("Ambulance"),
  getActiveRequests
);

// Ambulance user accepts a specific request
router.post(
  "/requests/:requestId/accept",
  isAuthenticated,
  authorizeRoles("Ambulance"),
  acceptAmbulanceRequest
);

// Patient cancels their ambulance request
router.delete(
  "/requests/:requestId/cancel",
  isAuthenticated,
  authorizeRoles("Patient"),
  cancelAmbulanceRequest
);

// Patient gets their active ambulance request
router.get(
  "/my-request",
  isAuthenticated,
  authorizeRoles("Patient"),
  getMyAmbulanceRequest
);

// Ambulance gets their accepted request
router.get(
  "/my-accepted-request",
  isAuthenticated,
  authorizeRoles("Ambulance"),
  getMyAcceptedRequest
);

// ========== Ambulance Management Routes ==========

// Get all active ambulances - accessible by admin, manager, receptionist, and ambulance crew
router.get(
  "/",
  isAuthenticated,
  authorizeRoles("Admin", "Manager", "Receptionist", "Ambulance"),
  getAllAmbulances
);

// Get specific ambulance - accessible by admin, manager, ambulance crew
router.get(
  "/:ambulanceId",
  isAuthenticated,
  authorizeRoles("Admin", "Manager", "Ambulance"),
  getAmbulanceById
);

// Update ambulance status - only ambulance crew can update their own status
router.put(
  "/:ambulanceId/status",
  isAuthenticated,
  authorizeRoles("Ambulance"),
  updateAmbulanceStatus
);

// Assign ambulance - only admin and receptionist can assign
router.post(
  "/:ambulanceId/assign",
  isAuthenticated,
  authorizeRoles("Admin", "Receptionist"),
  assignAmbulance
);

// Approve pickup request - ambulance crew approves the request
router.post(
  "/:ambulanceId/approve-pickup",
  isAuthenticated,
  authorizeRoles("Ambulance"),
  approvePickupRequest
);

// Reject pickup request - ambulance crew rejects the request
router.post(
  "/:ambulanceId/reject-pickup",
  isAuthenticated,
  authorizeRoles("Ambulance"),
  rejectPickupRequest
);

// Accept pickup request - ambulance confirms they are picking up the patient
router.post(
  "/:ambulanceId/accept-pickup",
  isAuthenticated,
  authorizeRoles("Ambulance"),
  acceptPickup
);

// Mark patient as arrived at hospital
router.post(
  "/:ambulanceId/mark-arrived",
  isAuthenticated,
  authorizeRoles("Ambulance"),
  markPatientArrived
);

export default router;
