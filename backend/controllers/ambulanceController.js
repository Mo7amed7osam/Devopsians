import User from "../models/userModel.js";
import Hospital from "../models/hospitalmodel.js";
import { ICU } from "../models/roomModel.js";
import AmbulanceRequest from "../models/ambulanceRequestModel.js";
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

// Create ambulance request (Patient creates a pickup request)
export const createAmbulanceRequest = async (req, res, next) => {
  try {
    const { pickupLocation, pickupCoordinates, urgency, notes } = req.body;
    const patientId = req.user.id; // From auth middleware

    // Validate patient
    const patient = await User.findById(patientId).populate('reservedICU');
    if (!patient || patient.role !== 'Patient') {
      return next(new ErrorHandler('Only patients can create ambulance requests', 403));
    }

    // Check if patient has an ICU reservation
    if (!patient.reservedICU) {
      return next(new ErrorHandler('You must have an ICU reservation before requesting an ambulance', 400));
    }

    // Check if patient already has an active request
    const existingRequest = await AmbulanceRequest.findOne({
      patient: patientId,
      status: { $in: ['pending', 'accepted', 'in_transit'] }
    });

    if (existingRequest) {
      return next(new ErrorHandler('You already have an active ambulance request', 400));
    }

    // Get hospital from ICU reservation
    const icu = await ICU.findById(patient.reservedICU).populate('hospital');
    if (!icu || !icu.hospital) {
      return next(new ErrorHandler('Could not find hospital for your ICU reservation', 404));
    }

    // Validate coordinates
    if (!pickupCoordinates || !Array.isArray(pickupCoordinates.coordinates) || pickupCoordinates.coordinates.length !== 2) {
      return next(new ErrorHandler('Valid pickup coordinates are required', 400));
    }

    // Create ambulance request
    const ambulanceRequest = new AmbulanceRequest({
      patient: patientId,
      hospital: icu.hospital._id,
      icu: patient.reservedICU,
      pickupLocation: pickupLocation || 'Patient location',
      pickupCoordinates: {
        type: 'Point',
        coordinates: pickupCoordinates.coordinates // [longitude, latitude]
      },
      patientPhone: patient.phone,
      urgency: urgency || 'normal',
      notes: notes || '',
      status: 'pending'
    });

    await ambulanceRequest.save();

    // Update patient status
    patient.patientStatus = 'AWAITING_PICKUP';
    patient.needsPickup = true;
    patient.pickupLocation = pickupLocation;
    await patient.save();

    // Populate request with details for broadcasting
    const populatedRequest = await AmbulanceRequest.findById(ambulanceRequest._id)
      .populate('patient', 'firstName lastName phone')
      .populate('hospital', 'name address location')
      .populate('icu', 'specialization room');

    // Broadcast to all available ambulances via socket
    if (io) {
      io.emit('ambulancePickupRequest', {
        requestId: populatedRequest._id,
        patientId: populatedRequest.patient._id,
        patientName: `${populatedRequest.patient.firstName} ${populatedRequest.patient.lastName}`,
        patientPhone: populatedRequest.patient.phone,
        pickupLocation: populatedRequest.pickupLocation,
        pickupCoordinates: populatedRequest.pickupCoordinates.coordinates,
        hospitalId: populatedRequest.hospital._id,
        hospitalName: populatedRequest.hospital.name,
        hospitalLocation: populatedRequest.hospital.location?.coordinates,
        specialization: populatedRequest.icu?.specialization || 'ICU',
        room: populatedRequest.icu?.room || 'N/A',
        urgency: populatedRequest.urgency,
        timestamp: populatedRequest.createdAt
      });

      // Notify patient
      io.emit('patientNotification', {
        patientId: populatedRequest.patient._id,
        message: '🚑 Your ambulance request has been sent to all available ambulance crews!',
        type: 'pickup_request_sent'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Ambulance request created successfully',
      data: populatedRequest
    });
  } catch (error) {
    console.error('Error creating ambulance request:', error);
    next(new ErrorHandler('Failed to create ambulance request', 500));
  }
};

// Get all active ambulance requests (for ambulance users)
export const getActiveRequests = async (req, res, next) => {
  try {
    const ambulanceId = req.user.id;
    const ambulance = await User.findById(ambulanceId);

    if (!ambulance || ambulance.role !== 'Ambulance') {
      return next(new ErrorHandler('Only ambulance users can view requests', 403));
    }

    // Get ambulance location for distance calculation (robust parsing)
    let ambulanceLocation = null;
    if (typeof req.query.location === 'string' && req.query.location.length) {
      try {
        // Attempt to parse JSON form: { coordinates: [lng, lat] }
        const parsed = JSON.parse(req.query.location);
        if (parsed && Array.isArray(parsed.coordinates) && parsed.coordinates.length === 2) {
          ambulanceLocation = { coordinates: parsed.coordinates };
        }
      } catch (e) {
        // Fallback: support "lat,lng" or "lng,lat" comma formats
        try {
          const parts = req.query.location.split(',').map(x => parseFloat(x));
          if (parts.length === 2 && parts.every(n => !Number.isNaN(n))) {
            // Assume format was lng,lat (most common for GeoJSON)
            ambulanceLocation = { coordinates: [parts[0], parts[1]] };
          }
        } catch {}
      }
    }

    // Find all pending requests
    let requests = await AmbulanceRequest.find({ status: 'pending' })
      .populate('patient', 'firstName lastName phone')
      .populate('hospital', 'name address location')
      .populate('icu', 'specialization room fees')
      .sort({ createdAt: -1 });

    // Calculate distance from ambulance to each pickup location
    if (ambulanceLocation && Array.isArray(ambulanceLocation.coordinates) && ambulanceLocation.coordinates.length === 2) {
      const [ambLng, ambLat] = ambulanceLocation.coordinates;

      requests = requests.map(req => {
        try {
          const coords = req?.pickupCoordinates?.coordinates;
          if (Array.isArray(coords) && coords.length === 2) {
            const [pickupLng, pickupLat] = coords;
            const distance = calculateDistance(ambLat, ambLng, pickupLat, pickupLng);
            return { ...req.toObject(), distance: distance.toFixed(2) };
          }
        } catch {}
        return req.toObject();
      });

      // Sort by distance (closest first)
      requests.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    }

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('Error fetching active requests:', error);
    next(new ErrorHandler('Failed to fetch active requests', 500));
  }
};

// Accept ambulance request (Ambulance user accepts a request)
export const acceptAmbulanceRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const ambulanceId = req.user.id;

    // Validate ambulance
    const ambulance = await User.findById(ambulanceId);
    if (!ambulance || ambulance.role !== 'Ambulance') {
      return next(new ErrorHandler('Only ambulance users can accept requests', 403));
    }

    // Check ambulance availability
    if (ambulance.status !== 'AVAILABLE') {
      return next(new ErrorHandler('You must be AVAILABLE to accept requests', 400));
    }

    if (ambulance.assignedPatient) {
      return next(new ErrorHandler('You already have an active assignment', 400));
    }

    // Find the request
    const request = await AmbulanceRequest.findById(requestId)
      .populate('patient', 'firstName lastName phone reservedICU')
      .populate('hospital', 'name address location')
      .populate('icu', 'specialization room');

    if (!request) {
      return next(new ErrorHandler('Request not found', 404));
    }

    // Check if request is still pending
    if (request.status !== 'pending') {
      return next(new ErrorHandler('This request has already been accepted by another ambulance', 400));
    }

    // Update request status
    request.status = 'accepted';
    request.acceptedBy = ambulanceId;
    request.acceptedAt = new Date();
    await request.save();

    // Update ambulance
    ambulance.status = 'EN_ROUTE';
    ambulance.assignedPatient = request.patient._id;
    ambulance.assignedHospital = request.hospital._id;
    ambulance.destination = request.hospital.name;
    await ambulance.save();

    // Update patient
    const patient = await User.findById(request.patient._id);
    patient.patientStatus = 'IN_TRANSIT';
    patient.assignedAmbulance = ambulanceId;
    await patient.save();

    // Broadcast via socket
    if (io) {
      // Notify patient
      io.emit('ambulanceAccepted', {
        patientId: request.patient._id,
        ambulanceId: ambulance._id,
        ambulanceName: `${ambulance.firstName} ${ambulance.lastName}`,
        message: `🚑 ${ambulance.firstName} ${ambulance.lastName} is on the way to pick you up!`
      });

      // Remove request from all ambulances' lists
      io.emit('pickupRequestTaken', {
        requestId: request._id,
        patientId: request.patient._id,
        ambulanceId: ambulance._id
      });

      // Notify patient directly
      io.emit('patientNotification', {
        patientId: request.patient._id,
        message: `🚑 Ambulance crew ${ambulance.firstName} ${ambulance.lastName} accepted your pickup request and is on the way!`,
        type: 'ambulance_accepted',
        ambulanceId: ambulance._id,
        ambulanceName: `${ambulance.firstName} ${ambulance.lastName}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Request accepted successfully',
      data: {
        request,
        ambulance,
        patient
      }
    });
  } catch (error) {
    console.error('Error accepting ambulance request:', error);
    next(new ErrorHandler('Failed to accept ambulance request', 500));
  }
};

// Cancel ambulance request (Patient cancels their request)
export const cancelAmbulanceRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const patientId = req.user.id;

    const request = await AmbulanceRequest.findById(requestId);
    if (!request) {
      return next(new ErrorHandler('Request not found', 404));
    }

    // Verify it's the patient's request
    if (request.patient.toString() !== patientId) {
      return next(new ErrorHandler('You can only cancel your own requests', 403));
    }

    // Can only cancel if pending or accepted (not in_transit or later)
    if (!['pending', 'accepted'].includes(request.status)) {
      return next(new ErrorHandler('Cannot cancel request at this stage', 400));
    }

    // If accepted, notify ambulance
    if (request.status === 'accepted' && request.acceptedBy) {
      const ambulance = await User.findById(request.acceptedBy);
      if (ambulance) {
        ambulance.status = 'AVAILABLE';
        ambulance.assignedPatient = null;
        ambulance.assignedHospital = null;
        ambulance.destination = null;
        await ambulance.save();

        // Notify ambulance via socket
        if (io) {
          io.emit('pickupRequestCancelled', {
            ambulanceId: ambulance._id,
            requestId: request._id,
            message: 'Patient cancelled the pickup request'
          });
        }
      }
    }

    request.status = 'cancelled';
    await request.save();

    // Update patient
    const patient = await User.findById(patientId);
    patient.patientStatus = 'RESERVED';
    patient.needsPickup = false;
    patient.assignedAmbulance = null;
    await patient.save();

    // Broadcast cancellation
    if (io) {
      io.emit('pickupRequestCancelled', {
        requestId: request._id,
        patientId: patientId
      });
    }

    res.status(200).json({
      success: true,
      message: 'Request cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling ambulance request:', error);
    next(new ErrorHandler('Failed to cancel ambulance request', 500));
  }
};

// Get patient's active ambulance request
export const getMyAmbulanceRequest = async (req, res, next) => {
  try {
    const patientId = req.user.id;

    const request = await AmbulanceRequest.findOne({
      patient: patientId,
      status: { $in: ['pending', 'accepted', 'in_transit'] }
    })
      .populate('acceptedBy', 'firstName lastName phone currentLocation')
      .populate('hospital', 'name address location')
      .populate('icu', 'specialization room');

    if (!request) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No active ambulance request'
      });
    }

    res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Error fetching patient request:', error);
    next(new ErrorHandler('Failed to fetch ambulance request', 500));
  }
};

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}
