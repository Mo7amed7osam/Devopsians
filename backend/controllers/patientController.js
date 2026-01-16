import { ICU } from "../models/roomModel.js";
import Hospital from "../models/hospitalmodel.js";
import Service from "../models/serviceModel.js";
import User from "../models/userModel.js";
import Feedback from "../models/feedbackModel.js";
import AmbulanceRequest from "../models/ambulanceRequestModel.js";
import { app, io } from "../index.js";

export const fetchAvailableICUs = async (longitude, latitude) => {
  // Fetch available ICUs from the database
  const icus = await ICU.find({ status: { $regex: '^available$', $options: 'i' } })
    .populate("hospital", "name address location")
    .exec();

  if (icus.length === 0) {
    console.log("No available ICUs found.");
    return [];
  }

  // Helper function to calculate distance between two coordinates
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

  // Filter and sort ICUs based on distance
  const nearbyICUs = icus
    .map((icu) => {
      if (
        icu.hospital?.location?.coordinates &&
        icu.hospital.location.coordinates.length === 2
      ) {
        const [hospitalLng, hospitalLat] = icu.hospital.location.coordinates;
        const distance = calculateDistance(
          latitude,
          longitude,
          hospitalLat,
          hospitalLng
        );
        return { ...icu.toObject(), distance };
      }
      return null;
    })
    .filter(Boolean) // Remove invalid entries
    .filter((icu) => icu.distance)
    .sort((a, b) => a.distance - b.distance); // Sort by closest distance

  console.log("Nearby ICUs:", nearbyICUs);
  return nearbyICUs;
};
// Existing route handler
export const getAvailableICUs = async (req, res) => {
  const { userLocation } = req.query;
  //console.log("Received userLocation:", userLocation); // Log the location to check if it matches the expected format
  if (!userLocation) {
    return res.status(400).json({ message: "User location is required." });
  }
  const [lng, lat] = userLocation.split(",").map(Number);
  //console.log("this is the lng:", lng);
  //console.log("this is the lat:", lat);
  if (isNaN(lng) || isNaN(lat)) {
    return res.status(400).json({ message: "Invalid location format." });
  }
  try {
    const icus = await fetchAvailableICUs(lng, lat);
    res.json({ icus });
  } catch (err) {
    console.error("Error fetching ICUs:", err);
    res.status(500).json({ message: "Failed to fetch ICUs." });
  }
};

export const reserveICU = async (req, res) => {
  const { userId, icuId, needsPickup, pickupLocation, pickupCoordinates } = req.body;

  try {
    const icu = await ICU.findById(icuId).populate("hospital", "name address location");
    if (!icu || !icu.hospital) {
      return res.status(404).json({ message: "ICU not found." });
    }

    // Case-insensitive status check
    if ((icu.status || '').toLowerCase() !== "available") {
      return res
        .status(400)
        .json({ message: "ICU is not available for reservation." });
    }

    // Get patient details
    const patient = await User.findById(userId);
    if (!patient || patient.role !== 'Patient') {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Update ICU status (atomic update to avoid validation on legacy docs missing required fields)
    await ICU.findByIdAndUpdate(
      icuId,
      { $set: { status: "Occupied", isReserved: true, reservedBy: userId } },
      { new: true, runValidators: false }
    );

    // Update patient status and reservation
    patient.reservedICU = icuId;
    patient.patientStatus = 'RESERVED';
    patient.needsPickup = needsPickup || false;
    patient.pickupLocation = pickupLocation || null;
    
    // IMPORTANT: Clear any previous ambulance assignment when making new reservation
    patient.assignedAmbulance = null;

    // Clear any previous ambulance assignment if patient doesn't need pickup
    if (!needsPickup) {
      patient.pickupLocation = null;
    }

    // If patient needs pickup, create an ambulance request
    let ambulanceRequest = null;
    if (needsPickup) {
      // Set patient status to AWAITING_PICKUP (no ambulance assigned yet)
      patient.patientStatus = 'AWAITING_PICKUP';
      
      // Delete any existing pending or accepted requests for this patient
      await AmbulanceRequest.deleteMany({
        patient: userId,
        status: { $in: ['pending', 'accepted'] }
      });

      // Validate or set default coordinates
      let coordinates = [31.2357, 30.0444]; // Default to Cairo
      if (pickupCoordinates && Array.isArray(pickupCoordinates.coordinates) && pickupCoordinates.coordinates.length === 2) {
        coordinates = pickupCoordinates.coordinates;
      } else if (pickupCoordinates && Array.isArray(pickupCoordinates) && pickupCoordinates.length === 2) {
        coordinates = pickupCoordinates;
      }

      // Create ambulance request
      ambulanceRequest = new AmbulanceRequest({
        patient: userId,
        hospital: icu.hospital._id,
        icu: icuId,
        pickupLocation: pickupLocation || 'Patient location',
        pickupCoordinates: {
          type: 'Point',
          coordinates: coordinates // [longitude, latitude]
        },
        patientPhone: patient.phone,
        urgency: 'normal',
        notes: '',
        status: 'pending'
      });

      await ambulanceRequest.save();

      // Populate request with details for broadcasting
      const populatedRequest = await AmbulanceRequest.findById(ambulanceRequest._id)
        .populate('patient', 'firstName lastName phone')
        .populate('hospital', 'name address location')
        .populate('icu', 'specialization room');

      try {
        if (io && typeof io.emit === 'function') {
          // Broadcast pickup request to ALL ambulances
          io.emit('ambulancePickupRequest', {
            requestId: populatedRequest._id,
            patientId: userId,
            patientName: `${patient.firstName} ${patient.lastName}`,
            patientPhone: patient.phone,
            hospitalId: icu.hospital._id,
            hospitalName: icu.hospital.name,
            pickupLocation: pickupLocation || 'Patient Location',
            pickupCoordinates: coordinates,
            hospitalLocation: icu.hospital.location?.coordinates,
            icuId: icu._id,
            specialization: icu.specialization,
            room: icu.room,
            urgency: 'normal',
            timestamp: new Date()
          });

          // Notify patient that request is PENDING
          io.emit('patientNotification', {
            patientId: userId,
            message: `Pickup request sent to all available ambulances. Status: PENDING - Waiting for a crew to accept...`,
            type: 'pickup_request_sent'
          });
        } else {
          console.warn('Socket.io not initialized; skipping pickup broadcast.');
        }
      } catch (emitErr) {
        console.error('Error emitting Socket.IO events for pickup request:', emitErr);
      }
    }

    await patient.save();

    // Create a service entry for the ICU reservation
    const serviceDetails = {
      name: `ICU Reservation - ${icu.hospital.name}`,
      fee: icu.fees,
      category: "ICU",
      description: `Reserved by user ID: ${userId} at hospital ${icu.hospital.name}, address: ${icu.hospital.address}`,
      reservedBy: userId,
    };

    const newService = new Service(serviceDetails);
    await newService.save();

    // Fetch updated ICU list and emit
    const updatedICUs = await ICU.find({ status: { $regex: '^available$', $options: 'i' } })
      .populate("hospital", "name address")
      .exec();
    io.emit("icuUpdated", updatedICUs);

    res.json({
      message: "ICU reserved successfully. " + (needsPickup ? "Ambulance request is PENDING." : ""),
      needsPickup: needsPickup || false,
      requestStatus: ambulanceRequest ? 'pending' : null,
      ambulanceAssigned: false, // Never auto-assign
      icu: {
        id: icu._id,
        hospital: icu.hospital,
        specialization: icu.specialization,
        fees: icu.fees,
        status: "Occupied",
      },
    });
  } catch (err) {
    console.error("Error reserving ICU:", err);
    res.status(500).json({ message: "Failed to reserve ICU." });
  }
};

export const freeICU = async (req, res) => {
  const { userId, icuId } = req.body;

  try {
    const icu = await ICU.findById(icuId).populate("hospital", "name address");
    if (!icu) {
      return res.status(404).json({ message: "ICU not found." });
    }

    if (icu.status === "Available") {
      return res
        .status(400)
        .json({ message: "ICU is already free and not reserved." });
    }

    // Check if the ICU is reserved by the user
    if (icu.reservedBy.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to free this ICU." });
    }

    // Free the ICU (mark as available and reset reservation)
    icu.status = "Available";
    icu.isReserved = false;
    icu.reservedBy = null;
    await icu.save();

    // Fetch updated ICU list and emit
    const updatedICUs = await ICU.find({ status: { $regex: '^available$', $options: 'i' } })
      .populate("hospital", "name address")
      .exec();
    io.emit("icuUpdated", updatedICUs);

    res.json({
      message: "ICU freed successfully.",
      icu: {
        id: icu._id,
        hospital: icu.hospitalId,
        specialization: icu.specialization,
        fees: icu.fees,
        status: icu.status,
      },
    });
  } catch (err) {
    console.error("Error freeing ICU:", err);
    res.status(500).json({ message: "Failed to free ICU." });
  }
};

export const updateMedicalHistory = async (req, res) => {
  const { userId, medicalHistory, currentCondition } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (medicalHistory) {
      user.medicalHistory = medicalHistory;
    }
    if (currentCondition) {
      user.currentCondition = currentCondition;
    }
    await user.save();

    res.json({ message: "Medical history updated successfully.", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const rateHospital = async (req, res) => {
  const { userId, hospitalId, rating, comment } = req.body;

  try {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found." });
    }

    const newRating = new Feedback({
      hospital: hospitalId,
      user: userId,
      rating,
      comment,
    });

    await newRating.save();

    res.json({ message: "Rating submitted successfully.", newRating });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getHospitalRating = async (req, res) => {
  const { hospitalId } = req.params;
  const userId = req.user?.id;

  try {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found." });
    }

    const feedbacks = await Feedback.find({ hospital: hospitalId });
    const totalRatings = feedbacks.reduce((sum, feedback) => sum + feedback.rating, 0);
    const averageRating = feedbacks.length
      ? Number((totalRatings / feedbacks.length).toFixed(2))
      : 5;

    const patientFeedback = userId
      ? await Feedback.findOne({ hospital: hospitalId, user: userId }).sort({ createdAt: -1 })
      : null;

    res.status(200).json({
      success: true,
      data: {
        averageRating,
        totalFeedbacks: feedbacks.length,
        patientRating: patientFeedback ? patientFeedback.rating : null,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const reserveVisitorRoom = async (req, res) => {
  const { userId, roomId } = req.body;

  try {
    const room = await VisitorRoom.findById(roomId);
    if (!room || room.status !== "Available") {
      return res
        .status(400)
        .json({ message: "Room is not available for reservation." });
    }

    room.status = "Reserved";
    room.reservedBy = userId;
    room.reservationHistory.push({ user: userId });
    await room.save();

    const user = await User.findById(userId);
    user.totalFees += room.fees;
    user.services.push({ serviceId: roomId });
    await user.save();

    res.json({ message: "Visitor room reserved successfully.", room });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getTotalFees = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ totalFees: user.totalFees });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMedicineSchedule = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ medicineSchedule: user.medicineSchedule });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const reserveKidsArea = async (req, res) => {
  const { userId, roomId, timeSlot } = req.body;

  try {
    const room = await VisitorRoom.findById(roomId);
    if (!room || room.roomType !== "Kids Area" || room.status !== "Available") {
      return res.status(400).json({ message: "Kids area is not available." });
    }

    room.status = "Reserved";
    room.reservationHistory.push({ user: userId, timeSlot });
    await room.save();

    const user = await User.findById(userId);
    user.services.push({ serviceId: roomId });
    await user.save();

    res.json({ message: "Time slot reserved successfully.", room });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getUserReservedServices = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).populate("services.serviceId");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ services: user.services });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Function to create a new service and save it to the database
export const createService = async (req, res) => {
  try {
    // Extract service details from the request body
    const { name, fee, category, description } = req.body;

    // Validate required fields
    if (!name || !fee) {
      return res.status(400).json({ message: "Name and fee are required." });
    }

    // Create a new service instance
    const newService = new Service({
      name,
      fee,
      category,
      description,
    });

    // Save the service to the database
    const savedService = await newService.save();

    // Respond with the saved service
    res.status(201).json({
      message: "Service created successfully.",
      service: savedService,
    });
  } catch (error) {
    // Handle errors and respond with a status 500 if needed
    res.status(500).json({
      message: "Error creating service.",
      error: error.message,
    });
  }
};
