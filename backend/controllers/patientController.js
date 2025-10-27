import ICU from "../models/icuModel.js";
import Hospital from "../models/hospitalModel.js";
import VisitorRoom from "../models/visitorsRoomModel.js";
import Service from "../models/serviceModel.js";
import User from "../models/userModel.js";
import Feedback from "../models/feedbackModel.js";
import { app, io } from "../index.js";

export const fetchAvailableICUs = async (longitude, latitude) => {
  // Fetch available ICUs from the database
  const icus = await ICU.find({ status: "Available" })
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
  const { userId, icuId } = req.body;

  try {
    const icu = await ICU.findById(icuId).populate("hospital", "name address");
    if (!icu.hospital || !icu) {
      return res.status(404).json({ message: "ICU not found." });
    }

    if (icu.status !== "Available") {
      return res
        .status(400)
        .json({ message: "ICU is not available for reservation." });
    }

    // Update ICU status
    icu.status = "Occupied";
    icu.isReserved = true;
    icu.reservedBy = userId;
    await icu.save();

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
    const updatedICUs = await ICU.find({ status: "Available" })
      .populate("hospital", "name address")
      .exec();
    io.emit("icuUpdated", updatedICUs);

    res.json({
      message: "ICU reserved successfully.",
      icu: {
        id: icu._id,
        hospital: icu.hospital,
        specialization: icu.specialization,
        fees: icu.fees,
        status: icu.status,
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
    const updatedICUs = await ICU.find({ status: "Available" })
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
