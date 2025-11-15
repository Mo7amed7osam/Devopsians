import User from "../models/userModel.js";
import Hospital from "../models/hospitalmodel.js";
import ErrorHandler from "../utils/errorHandler.js";
import { io } from "../index.js";

// Get all active ambulances
export const getAllAmbulances = async (req, res, next) => {
  try {
    const ambulances = await User.find({ 
      role: "Ambulance",
      status: { $in: ["AVAILABLE", "EN_ROUTE", "ARRIVED_HOSPITAL"] }
    })
    .populate('assignedHospital', 'name address location')
    .populate('assignedPatient', 'firstName lastName')
    .select("-userPass");

    res.status(200).json({
      success: true,
      count: ambulances.length,
      ambulances,
    });
  } catch (error) {
    console.error("Error fetching ambulances:", error);
    next(new ErrorHandler("Failed to fetch ambulances", 500));
  }
};

// Update ambulance status
export const updateAmbulanceStatus = async (req, res, next) => {
  try {
    const { ambulanceId } = req.params;
    const { status, location, eta } = req.body;

    const validStatuses = ["AVAILABLE", "EN_ROUTE", "ARRIVED_HOSPITAL"];
    if (status && !validStatuses.includes(status)) {
      return next(new ErrorHandler("Invalid status", 400));
    }

    const ambulance = await User.findById(ambulanceId);
    if (!ambulance || ambulance.role !== "Ambulance") {
      return next(new ErrorHandler("Ambulance not found", 404));
    }

    if (status) ambulance.status = status;
    if (location) ambulance.currentLocation = location;
    if (eta) ambulance.eta = eta;

    await ambulance.save();

    // Emit socket event for real-time update
    if (io) {
      io.emit("ambulanceStatusUpdate", {
        ambulanceId: ambulance._id,
        status: ambulance.status,
        location: ambulance.currentLocation,
        eta: ambulance.eta,
      });
    }

    res.status(200).json({
      success: true,
      message: "Ambulance status updated successfully",
      ambulance,
    });
  } catch (error) {
    console.error("Error updating ambulance status:", error);
    next(new ErrorHandler("Failed to update ambulance status", 500));
  }
};

// Get ambulance by ID
export const getAmbulanceById = async (req, res, next) => {
  try {
    const { ambulanceId } = req.params;

    const ambulance = await User.findById(ambulanceId).select("-userPass");
    if (!ambulance || ambulance.role !== "Ambulance") {
      return next(new ErrorHandler("Ambulance not found", 404));
    }

    res.status(200).json({
      success: true,
      ambulance,
    });
  } catch (error) {
    console.error("Error fetching ambulance:", error);
    next(new ErrorHandler("Failed to fetch ambulance", 500));
  }
};

// Assign ambulance to patient/hospital
export const assignAmbulance = async (req, res, next) => {
  try {
    const { ambulanceId } = req.params;
    const { patientId, hospitalId, destination } = req.body;

    const ambulance = await User.findById(ambulanceId);
    if (!ambulance || ambulance.role !== "Ambulance") {
      return next(new ErrorHandler("Ambulance not found", 404));
    }

    if (ambulance.status !== "AVAILABLE") {
      return next(new ErrorHandler("Ambulance is not available", 400));
    }

    // Get hospital details for accurate location
    let hospitalDetails = null;
    if (hospitalId) {
      hospitalDetails = await Hospital.findById(hospitalId);
      if (!hospitalDetails) {
        return next(new ErrorHandler("Hospital not found", 404));
      }
    }

    ambulance.status = "EN_ROUTE";
    ambulance.assignedPatient = patientId;
    ambulance.assignedHospital = hospitalId;
    ambulance.destination = destination || hospitalDetails?.name || 'Hospital';

    await ambulance.save();

    // Emit socket event with hospital location
    if (io) {
      io.emit("ambulanceAssigned", {
        ambulanceId: ambulance._id,
        patientId,
        hospitalId,
        destination: ambulance.destination,
        hospitalLocation: hospitalDetails?.location,
      });
    }

    res.status(200).json({
      success: true,
      message: "Ambulance assigned successfully",
      ambulance: await ambulance.populate('assignedHospital', 'name address location'),
    });
  } catch (error) {
    console.error("Error assigning ambulance:", error);
    next(new ErrorHandler("Failed to assign ambulance", 500));
  }
};

// Approve pickup request - ambulance approves to take the patient
export const approvePickupRequest = async (req, res, next) => {
  try {
    const { ambulanceId } = req.params;
    const { patientId } = req.body;

    const ambulance = await User.findById(ambulanceId)
      .populate('assignedHospital', 'name address location');
    if (!ambulance || ambulance.role !== "Ambulance") {
      return next(new ErrorHandler("Ambulance not found", 404));
    }

    const patient = await User.findById(patientId);
    if (!patient || patient.role !== "Patient") {
      return next(new ErrorHandler("Patient not found", 404));
    }

    // Update ambulance status to EN_ROUTE
    ambulance.status = 'EN_ROUTE';
    await ambulance.save();

    // Patient status remains AWAITING_PICKUP until receptionist approves
    // But we notify the receptionist that ambulance is ready
    
    // Emit socket event to notify receptionist
    if (io) {
      io.emit("ambulanceApprovedPickup", {
        ambulanceId: ambulance._id,
        ambulanceName: `${ambulance.firstName} ${ambulance.lastName}`,
        patientId: patient._id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        hospitalId: ambulance.assignedHospital?._id,
        hospitalName: ambulance.assignedHospital?.name,
        pickupLocation: patient.pickupLocation,
        icuId: patient.reservedICU
      });

      // Notify patient that ambulance approved
      io.emit("patientNotification", {
        patientId: patient._id,
        message: "Ambulance crew has approved your pickup request! Waiting for receptionist confirmation.",
        type: "ambulance_approved"
      });
    }

    res.status(200).json({
      success: true,
      message: "Pickup request approved. Waiting for receptionist confirmation.",
      ambulance,
      patient
    });
  } catch (error) {
    console.error("Error approving pickup:", error);
    next(new ErrorHandler("Failed to approve pickup", 500));
  }
};

// Reject pickup request - ambulance declines
export const rejectPickupRequest = async (req, res, next) => {
  try {
    const { ambulanceId } = req.params;
    const { patientId, reason } = req.body;

    const ambulance = await User.findById(ambulanceId);
    if (!ambulance || ambulance.role !== "Ambulance") {
      return next(new ErrorHandler("Ambulance not found", 404));
    }

    const patient = await User.findById(patientId);
    if (!patient || patient.role !== "Patient") {
      return next(new ErrorHandler("Patient not found", 404));
    }

    // Clear ambulance assignment
    ambulance.assignedPatient = null;
    ambulance.assignedHospital = null;
    ambulance.destination = null;
    await ambulance.save();

    // Clear patient ambulance assignment
    patient.assignedAmbulance = null;
    patient.patientStatus = 'RESERVED'; // Back to reserved, needs new ambulance
    await patient.save();

    // Emit socket event
    if (io) {
      io.emit("ambulanceRejectedPickup", {
        ambulanceId: ambulance._id,
        patientId: patient._id,
        reason: reason || "Ambulance crew declined the request",
      });

      // Notify receptionist to reassign
      io.emit("pickupRejectedNotification", {
        patientId: patient._id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        reason: reason || "Crew unavailable"
      });
    }

    res.status(200).json({
      success: true,
      message: "Pickup request rejected. Patient needs to be reassigned.",
    });
  } catch (error) {
    console.error("Error rejecting pickup:", error);
    next(new ErrorHandler("Failed to reject pickup", 500));
  }
};

// Accept pickup request - ambulance accepts the assignment
export const acceptPickup = async (req, res, next) => {
  try {
    const { ambulanceId } = req.params;
    const { patientId } = req.body;

    const ambulance = await User.findById(ambulanceId);
    if (!ambulance || ambulance.role !== "Ambulance") {
      return next(new ErrorHandler("Ambulance not found", 404));
    }

    // Check if ambulance is available
    if (ambulance.status !== 'AVAILABLE') {
      return next(new ErrorHandler("Ambulance is not available", 400));
    }

    // Check if ambulance already has an assignment
    if (ambulance.assignedPatient) {
      return next(new ErrorHandler("Ambulance is already assigned to another patient", 400));
    }

    const patient = await User.findById(patientId).populate('reservedICU');
    if (!patient || patient.role !== "Patient") {
      return next(new ErrorHandler("Patient not found", 404));
    }

    // Check if patient is still waiting for pickup
    if (patient.patientStatus !== 'AWAITING_PICKUP') {
      return next(new ErrorHandler("Patient is not awaiting pickup. Status: " + patient.patientStatus, 400));
    }

    // Check if patient already has an ambulance assigned
    if (patient.assignedAmbulance) {
      return next(new ErrorHandler("Patient already has an ambulance assigned", 400));
    }

    // Get hospital info from patient's ICU reservation
    const icu = await patient.reservedICU;
    if (!icu) {
      return next(new ErrorHandler("Patient has no ICU reservation", 404));
    }

    const hospital = await icu.populate('hospital', 'name address location');

    // Assign ambulance to patient
    ambulance.assignedPatient = patientId;
    ambulance.assignedHospital = icu.hospital._id;
    ambulance.destination = icu.hospital.name;
    ambulance.status = 'EN_ROUTE';
    await ambulance.save();

    // Update patient with ambulance assignment and status
    patient.assignedAmbulance = ambulanceId;
    patient.patientStatus = 'IN_TRANSIT';
    await patient.save();

    // Emit socket event to notify patient
    if (io) {
      // Notify the specific patient
      io.emit("ambulanceAccepted", {
        patientId: patient._id,
        ambulanceId: ambulance._id,
        ambulanceName: `${ambulance.firstName} ${ambulance.lastName}`,
        message: `🚑 ${ambulance.firstName} ${ambulance.lastName} is on the way to pick you up!`
      });

      // Notify all ambulances that this request is no longer available
      io.emit("pickupRequestTaken", {
        patientId: patient._id,
        ambulanceId: ambulance._id
      });

      // Emit patient notification
      io.emit("patientNotification", {
        patientId: patient._id,
        message: `🚑 Ambulance crew ${ambulance.firstName} ${ambulance.lastName} accepted your pickup request and is on the way!`,
        type: 'ambulance_accepted',
        ambulanceId: ambulance._id,
        ambulanceName: `${ambulance.firstName} ${ambulance.lastName}`
      });
    }

    res.status(200).json({
      success: true,
      message: "Pickup accepted. Patient is now in transit.",
      patient,
      ambulance,
    });
  } catch (error) {
    console.error("Error accepting pickup:", error);
    next(new ErrorHandler("Failed to accept pickup", 500));
  }
};

// Mark patient as arrived at hospital
export const markPatientArrived = async (req, res, next) => {
  try {
    const { ambulanceId } = req.params;
    const { patientId } = req.body;

    const ambulance = await User.findById(ambulanceId);
    if (!ambulance || ambulance.role !== "Ambulance") {
      return next(new ErrorHandler("Ambulance not found", 404));
    }

    const patient = await User.findById(patientId);
    if (!patient || patient.role !== "Patient") {
      return next(new ErrorHandler("Patient not found", 404));
    }

    // Update patient status to ARRIVED
    patient.patientStatus = 'ARRIVED';
    await patient.save();

    // Update ambulance status
    ambulance.status = 'ARRIVED_HOSPITAL';
    await ambulance.save();

    // Emit socket event
    if (io) {
      io.emit("patientArrived", {
        ambulanceId: ambulance._id,
        patientId: patient._id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        hospitalId: ambulance.assignedHospital,
      });
    }

    res.status(200).json({
      success: true,
      message: "Patient has arrived at hospital. Receptionist can now check them in.",
      patient,
      ambulance,
    });
  } catch (error) {
    console.error("Error marking patient arrived:", error);
    next(new ErrorHandler("Failed to mark patient as arrived", 500));
  }
};
