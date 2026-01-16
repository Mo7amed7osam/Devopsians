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

    // If status is set to ARRIVED_HOSPITAL, automatically transition to AVAILABLE
    // and clear assignment details after a brief moment
    if (status === "ARRIVED_HOSPITAL") {
      // Set to AVAILABLE immediately
      ambulance.status = "AVAILABLE";
      // Clear assignment details
      ambulance.assignedPatient = null;
      ambulance.assignedHospital = null;
      ambulance.destination = null;
      ambulance.eta = null;
    }

    await ambulance.save();

    // Emit socket event for real-time update
    if (io) {
      const eventData = {
        ambulanceId: ambulance._id,
        status: ambulance.status,
        location: ambulance.currentLocation,
        eta: ambulance.eta,
      };
      console.log('🚑 [Socket] Emitting ambulanceStatusUpdate:', eventData);
      io.emit("ambulanceStatusUpdate", eventData);
    } else {
      console.warn('⚠️ Socket.IO instance not available for ambulanceStatusUpdate');
    }

    res.status(200).json({
      success: true,
      message: ambulance.status === "AVAILABLE" 
        ? "Ambulance status updated to AVAILABLE and is now ready for new assignments"
        : "Ambulance status updated successfully",
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
      const eventData = {
        ambulanceId: ambulance._id,
        patientId,
        hospitalId,
        destination: ambulance.destination,
        hospitalLocation: hospitalDetails?.location,
      };
      console.log('🚑 [Socket] Emitting ambulanceAssigned:', eventData);
      io.emit("ambulanceAssigned", eventData);
    } else {
      console.warn('⚠️ Socket.IO instance not available for ambulanceAssigned');
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
      const approvedData = {
        ambulanceId: ambulance._id,
        ambulanceName: `${ambulance.firstName} ${ambulance.lastName}`,
        patientId: patient._id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        hospitalId: ambulance.assignedHospital?._id,
        hospitalName: ambulance.assignedHospital?.name,
        pickupLocation: patient.pickupLocation,
        icuId: patient.reservedICU
      };
      console.log('🚑 [Socket] Emitting ambulanceApprovedPickup:', approvedData);
      io.emit("ambulanceApprovedPickup", approvedData);

      // Notify patient that ambulance approved
      const patientData = {
        patientId: patient._id,
        message: "Ambulance crew has approved your pickup request! Waiting for receptionist confirmation.",
        type: "ambulance_approved"
      };
      console.log('📢 [Socket] Emitting patientNotification:', patientData);
      io.emit("patientNotification", patientData);
    } else {
      console.warn('⚠️ Socket.IO instance not available for ambulance approval events');
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

    if (!ambulance.assignedPatient) {
      return next(new ErrorHandler("Ambulance has no assigned patient", 400));
    }

    const assignedPatientId = ambulance.assignedPatient.toString();
    if (patientId && assignedPatientId !== patientId.toString()) {
      return next(new ErrorHandler("Ambulance is assigned to a different patient", 400));
    }

    if (ambulance.status !== 'EN_ROUTE') {
      return next(new ErrorHandler("Ambulance must be EN_ROUTE to mark pickup", 400));
    }

    const patient = await User.findById(ambulance.assignedPatient).populate('reservedICU');
    if (!patient || patient.role !== "Patient") {
      return next(new ErrorHandler("Patient not found", 404));
    }

    if (!['AWAITING_PICKUP', 'IN_TRANSIT'].includes(patient.patientStatus)) {
      return next(new ErrorHandler("Patient must be awaiting pickup before pickup can be marked", 400));
    }

    const activeRequest = await AmbulanceRequest.findOne({
      patient: patient._id,
      acceptedBy: ambulanceId,
      status: 'accepted'
    });

    if (!activeRequest) {
      return next(new ErrorHandler("No accepted pickup request found for this patient", 400));
    }

    activeRequest.status = 'in_transit';
    await activeRequest.save();

    patient.assignedAmbulance = ambulanceId;
    patient.patientStatus = 'IN_TRANSIT';
    await patient.save();

    // Emit socket event to notify patient
    if (io) {
      io.emit("patientNotification", {
        patientId: patient._id,
        message: `Ambulance crew ${ambulance.firstName} ${ambulance.lastName} has picked you up and is heading to the hospital.`,
        type: 'ambulance_picked_up',
        ambulanceId: ambulance._id,
        ambulanceName: `${ambulance.firstName} ${ambulance.lastName}`
      });
    } else {
      console.warn('⚠️ Socket.IO instance not available for pickup events');
    }

    res.status(200).json({
      success: true,
      message: "Patient picked up. In transit to hospital.",
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

    const activeRequest = await AmbulanceRequest.findOne({
      patient: patientId,
      acceptedBy: ambulanceId,
      status: 'in_transit'
    });

    if (!activeRequest) {
      return next(new ErrorHandler("Patient must be picked up before arrival can be marked", 400));
    }

    // Update patient status to ARRIVED
    patient.patientStatus = 'ARRIVED';
    patient.needsPickup = false;
    patient.assignedAmbulance = null;
    await patient.save();

    // Mark the active request as arrived so patient can request again
    activeRequest.status = 'arrived';
    await activeRequest.save();

    // Update ambulance status to AVAILABLE and clear assignment
    ambulance.status = 'AVAILABLE';
    ambulance.assignedPatient = null;
    ambulance.assignedHospital = null;
    ambulance.destination = null;
    ambulance.eta = null;
    await ambulance.save();

    // Emit socket event
    if (io) {
      io.emit("patientArrived", {
        ambulanceId: ambulance._id,
        patientId: patient._id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        hospitalId: ambulance.assignedHospital,
      });
      
      // Emit ambulance available event
      io.emit("ambulanceStatusUpdate", {
        ambulanceId: ambulance._id,
        status: ambulance.status,
        location: ambulance.currentLocation,
        message: "Ambulance is now available for new assignments"
      });
    }

    res.status(200).json({
      success: true,
      message: "Patient has arrived at hospital. Ambulance is now available for new assignments.",
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
      const requestData = {
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
      };
      console.log('🚑 [Socket] Emitting ambulancePickupRequest:', requestData);
      io.emit('ambulancePickupRequest', requestData);

      // Notify patient
      const patientNotif = {
        patientId: populatedRequest.patient._id,
        message: 'Your ambulance request has been sent to all available ambulance crews!',
        type: 'pickup_request_sent'
      };
      console.log('📢 [Socket] Emitting patientNotification:', patientNotif);
      io.emit('patientNotification', patientNotif);
    } else {
      console.warn('⚠️ Socket.IO instance not available for ambulance pickup request events');
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

    // Update patient (assigned, not yet picked up)
    const patient = await User.findById(request.patient._id);
    patient.patientStatus = 'AWAITING_PICKUP';
    patient.assignedAmbulance = ambulanceId;
    await patient.save();

    // Broadcast via socket
    if (io) {
      // Notify patient
      io.emit('ambulanceAccepted', {
        patientId: request.patient._id,
        ambulanceId: ambulance._id,
        ambulanceName: `${ambulance.firstName} ${ambulance.lastName}`,
        message: `${ambulance.firstName} ${ambulance.lastName} is on the way to pick you up!`
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
        message: `Ambulance crew ${ambulance.firstName} ${ambulance.lastName} accepted your pickup request and is on the way!`,
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
          const cancelData = {
            ambulanceId: ambulance._id,
            requestId: request._id,
            message: 'Patient cancelled the pickup request'
          };
          console.log('🚑 [Socket] Emitting pickupRequestCancelled (to ambulance):', cancelData);
          io.emit('pickupRequestCancelled', cancelData);
        } else {
          console.warn('⚠️ Socket.IO instance not available for pickup cancellation');
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
      const broadcastData = {
        requestId: request._id,
        patientId: patientId
      };
      console.log('📢 [Socket] Emitting pickupRequestCancelled (broadcast):', broadcastData);
      io.emit('pickupRequestCancelled', broadcastData);
    } else {
      console.warn('⚠️ Socket.IO instance not available for pickup cancellation broadcast');
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

// Get ambulance's accepted request
export const getMyAcceptedRequest = async (req, res, next) => {
  try {
    const ambulanceId = req.user.id;

    const request = await AmbulanceRequest.findOne({
      acceptedBy: ambulanceId,
      status: { $in: ['accepted', 'in_transit'] }
    })
      .populate('patient', 'firstName lastName phone')
      .populate('hospital', 'name address location')
      .populate('icu', 'specialization room');

    if (!request) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No active accepted request'
      });
    }

    res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Error fetching ambulance accepted request:', error);
    next(new ErrorHandler('Failed to fetch accepted request', 500));
  }
};

// Notify patient that ambulance is waiting at pickup location
export const notifyPatientWaiting = async (req, res, next) => {
  try {
    const { ambulanceId } = req.params;
    const { patientId, note } = req.body;

    const ambulance = await User.findById(ambulanceId);
    if (!ambulance || ambulance.role !== "Ambulance") {
      return next(new ErrorHandler("Ambulance not found", 404));
    }

    const patient = await User.findById(patientId);
    if (!patient || patient.role !== "Patient") {
      return next(new ErrorHandler("Patient not found", 404));
    }

    // Ensure this ambulance is assigned to this patient
    if (!ambulance.assignedPatient || ambulance.assignedPatient.toString() !== patient._id.toString()) {
      return next(new ErrorHandler("Ambulance is not assigned to this patient", 400));
    }

    // Emit socket events to notify the specific patient
    if (io) {
      io.emit("patientNotification", {
        patientId: patient._id,
        message: `Ambulance crew ${ambulance.firstName} ${ambulance.lastName} is waiting at your pickup location. ${note ? note : "Please proceed to meet them."}`,
        type: "ambulance_waiting",
        ambulanceId: ambulance._id,
        location: ambulance.currentLocation || null,
      });

      // Optional dedicated event for patient clients
      io.emit("ambulanceWaiting", {
        patientId: patient._id,
        ambulanceId: ambulance._id,
        ambulanceName: `${ambulance.firstName} ${ambulance.lastName}`,
        location: ambulance.currentLocation || null,
      });
    }

    res.status(200).json({
      success: true,
      message: "Patient has been notified that ambulance is waiting",
    });
  } catch (error) {
    console.error("Error notifying patient waiting:", error);
    next(new ErrorHandler("Failed to notify patient", 500));
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
