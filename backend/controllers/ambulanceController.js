import User from "../models/userModel.js";
import ErrorHandler from "../utils/errorHandler.js";
import { io } from "../index.js";

// Get all active ambulances
export const getAllAmbulances = async (req, res, next) => {
  try {
    const ambulances = await User.find({ 
      role: "Ambulance",
      status: { $in: ["AVAILABLE", "EN_ROUTE", "ARRIVED_HOSPITAL"] }
    }).select("-userPass");

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

    ambulance.status = "EN_ROUTE";
    ambulance.assignedPatient = patientId;
    ambulance.assignedHospital = hospitalId;
    ambulance.destination = destination;

    await ambulance.save();

    // Emit socket event
    if (io) {
      io.emit("ambulanceAssigned", {
        ambulanceId: ambulance._id,
        patientId,
        hospitalId,
        destination,
      });
    }

    res.status(200).json({
      success: true,
      message: "Ambulance assigned successfully",
      ambulance,
    });
  } catch (error) {
    console.error("Error assigning ambulance:", error);
    next(new ErrorHandler("Failed to assign ambulance", 500));
  }
};
