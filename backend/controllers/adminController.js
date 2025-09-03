import { ErrorHandler } from "../utils/errorHandler.js";
import Hospital from "../models/hospitalModel.js";
import ICU from "../models/icuModel.js";
import User from "../models/userModel.js";
import Feedback from "../models/feedbackModel.js";
import bcrypt from "bcrypt";
import validator from "validator";
import { io } from "../index.js";

// Add Hospital with ICUs

export const addHospital = async (req, res, next) => {
  try {
    const { name, address, email, longitude, latitude, contactNumber } =
      req.body;

    // Validate that all fields are provided
    if (
      !name ||
      !address ||
      !email ||
      !longitude ||
      !latitude ||
      !contactNumber
    ) {
      return next(
        new ErrorHandler(
          "All fields are required, including longitude, latitude",
          400
        )
      );
    }

    // Validate the email format
    if (!validator.isEmail(email)) {
      return next(new ErrorHandler("Invalid email address", 400));
    }

    // Check if the hospital already exists by email
    const existingHospital = await Hospital.findOne({ email });
    if (existingHospital) {
      return next(
        new ErrorHandler("A hospital with this email already exists", 400)
      );
    }

    // Ensure longitude and latitude are valid numbers
    const lon = parseFloat(longitude);
    const lat = parseFloat(latitude);

    if (isNaN(lon) || isNaN(lat)) {
      return next(new ErrorHandler("Invalid longitude or latitude", 400));
    }

    // Create the new hospital
    const newHospital = new Hospital({
      name,
      address,
      email,
      location: {
        type: "Point",
        coordinates: [lon, lat], // Longitude first, then latitude
      },
      contactNumber,
    });

    // Save the hospital to the database
    await newHospital.save();

    //emit the new hospital
    io.emit("hospitalAdded", newHospital);

    // Send the response back to the client
    res.status(201).json({
      message: "Hospital added successfully.",
      hospital: newHospital,
    });
  } catch (error) {
    // Handle unexpected errors
    next(new ErrorHandler(error.message, 500));
  }
};


export const viewHospitals = async (req, res, next) => {
  try {
    const { status, name, longitude, latitude , hospitalId} = req.query;
    

    const query = {};

    if (name) query.name = new RegExp(name, "i");
    if (status) query.status = status;

    let hospitals;

    if (longitude && latitude) {
      hospitals = await Hospital.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
            distanceField: "distance",
            spherical: true,
          },
        },
        { $match: query }, // Apply the query filters here
        { $sort: { distance: 1 } }, // Sort by nearest
      ]);
    } else {
      hospitals = await Hospital.find(query);
    }

    res.status(200).json({ hospitals });
  } catch (error) {
    next(new ErrorHandler(error.message, 500));
  }
};

export const assignManager = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { managerId } = req.body;

    if (!managerId) {
      return next(new ErrorHandler("Manager ID is required.", 400));
    }

    const user = await User.findOne(managerId);

    if (!user) {
      return next(new ErrorHandler("Manager not found.", 404));
    }

    if (user.role !== "Manager") {
      return next(new ErrorHandler("Only Managers can be assigned", 403));
    }

    const hospital = await Hospital.findByIdAndUpdate(
      id,
      { assignedManager: managerId },
      { new: true }
    ).populate("assignedManager", "firstName lastName email");

    if (!hospital) {
      return next(new ErrorHandler("Hospital not found.", 404));
    }

    res
      .status(200)
      .json({ message: "Manager assigned successfully.", hospital });
  } catch (error) {
    next(new ErrorHandler(error.message, 500));
  }
};
export const deleteHospital = async (req, res, next) => {
  try {
    const { id } = req.params;
    const hospital = await Hospital.findByIdAndDelete(id);
    res
      .status(200)
      .json({ message: "Hospital deleted successfully.", hospital });
  } catch (error) {
    next(new ErrorHandler(error.message, 500));
  }
};

export const blockHospital = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find and update the hospital status
    const hospital = await Hospital.findByIdAndUpdate(
      id,
      { status: "Blocked" },
      { new: true }
    );

    if (!hospital) {
      return next(new ErrorHandler("Hospital not found.", 404));
    }

    // Update ICU rooms status to 'Occupied' for the blocked hospital
    await ICU.updateMany(
      { hospital: id }, // Filter for ICU rooms belonging to the blocked hospital
      { status: "Occupied" } // Set status to 'Occupied'
    );
    
    const updatedICUs = await ICU.find({ status: 'Available',  }).populate('hospital', 'name address').exec();
    io.emit('icuUpdated', updatedICUs);
    res
      .status(200)
      .json({ message: "Hospital blocked successfully.", hospital });
  } catch (error) {
    next(new ErrorHandler(error.message, 500));
  }
};

//
export const unblockHospital = async (req, res, next) => {
  try {
    const { id } = req.params;

    const hospital = await Hospital.findById(id);
    if (!hospital) {
      return next(new ErrorHandler("Hospital not found", 404));
    }

    hospital.status = "Active";
    await hospital.save();

    await ICU.updateMany(
      { hospital: id }, // Filter for ICU rooms belonging to the blocked hospital
      { status: "Available" } // Set status to 'Occupied'
    );

    const updatedICUs = await ICU.find({ status: 'Available',  }).populate('hospital', 'name address').exec();
    io.emit('icuUpdated', updatedICUs);

    res
      .status(200)
      .json({ success: true, message: "Hospital unblocked successfully" });
  } catch (error) {
    next(new ErrorHandler(error.message, 500));
  }
};

//

export const viewHospitalsRating = async (req, res, next) => {
  try {
    const hospitals = await Hospital.find({ status: "Active" });

    const hospitalsWithRatings = [];

    for (const hospital of hospitals) {
      const feedbacks = await Feedback.find({ hospital: hospital._id });

      const totalRatings = feedbacks.reduce(
        (sum, feedback) => sum + feedback.rating,
        0
      );
      const averageRating = feedbacks.length
        ? (totalRatings / feedbacks.length).toFixed(2)
        : 0;

      hospitalsWithRatings.push({
        hospital: hospital.name,
        address: hospital.address,
        averageRating,
        totalFeedbacks: feedbacks.length,
      });
    }

    // Respond with the list of hospitals and their ratings
    res.status(200).json({
      success: true,
      data: hospitalsWithRatings,
    });
  } catch (error) {
    next(new ErrorHandler(error.message, 500));
  }
};

export const createManagerAccount = async (req, res, next) => {
  try {
    const { firstName, lastName, userName, password } = req.body;

    // Check if all fields are provided
    if (!firstName || !lastName || !userName || !password) {
      return next(new ErrorHandler("All fields are required", 400));
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ userName });
    if (existingUser) {
      return next(new ErrorHandler("User already exists", 400));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
      email,
      userPass: hashedPassword,
      role: "Manager",
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: "Manager account created successfully",
      data: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    next(new ErrorHandler(error.message, 500));
  }
};

export const createAdminAccount = async (req, res, next) => {
  try {
    const { firstName, lastName, userName, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return next(new ErrorHandler("All fields are required", 400));
    }

    const existingUser = await User.findOne({ userName });
    if (existingUser) {
      return next(new ErrorHandler("User already exists", 400));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
      email,
      userPass: hashedPassword,
      role: "Admin",
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: "Admin account created successfully",
      data: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    next(new ErrorHandler(error.message, 500));
  }
};

export const viewAllAdmins = async (req, res, next) => {
  try {
    const admins = await User.find({ role: "Admin" }).select("-userPass");
    res.status(200).json({
      success: true,
      message: "Admins retrieved successfully",
      data: admins,
    });
  } catch (error) {
    next(new ErrorHandler(error.message, 500));
  }
};

export const viewAllManagers = async (req, res, next) => {
  try {
    const managers = await User.find({ role: "Manager" }).select("-userPass");

    res.status(200).json({
      success: true,
      message: "Managers retrieved successfully",
      data: managers,
    });
  } catch (error) {
    next(new ErrorHandler(error.message, 500));
  }
};
export const viewAnManager = async (req, res, next) => {
  try {
    const id = req.params.id; // Get 'id' from URL params

    // Ensure that the 'id' is a valid MongoDB ObjectId (if you're using MongoDB)
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Manager ID format.",
      });
    }

    const manager = await User.findById(id).select("-userPass");

    if (!manager) {
      return res.status(404).json({
        success: false,
        message: "Manager not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Manager retrieved successfully",
      data: manager,
    });
  } catch (error) {
    next(new ErrorHandler(error.message, 500));
  }
};

export const searchManagerWithHospitals = async (req, res, next) => {
  try {
    const { managerId } = req.params;

    const manager = await User.findById(managerId).select("-userPass");

    if (!manager || manager.role !== "Manager") {
      return next(
        new ErrorHandler("Manager not found or is not a Manager", 404)
      );
    }

    const hospitals = await Hospital.find({
      assignedManager: managerId,
    }).select("name address location contactNumber status");

    res.status(200).json({
      success: true,
      message: "Manager and their assigned hospitals retrieved successfully",
      data: {
        manager,
        hospitals,
      },
    });
  } catch (error) {
    next(new ErrorHandler(error.message, 500));
  }
};

export const searchHospitalWithFeedbacks = async (req, res, next) => {
  try {
    const { hospitalId } = req.params;

    const hospital = await Hospital.findById(hospitalId).select(
      "name address email location contactNumber status"
    );

    if (!hospital) {
      return next(new ErrorHandler("Hospital not found", 404));
    }

    const feedbacks = await Feedback.find({ hospital: hospitalId })
      .populate("user", "firstName lastName")
      .select("rating comment createdAt");

    res.status(200).json({
      success: true,
      message: "Hospital and its feedbacks retrieved successfully",
      data: {
        hospital,
        feedbacks,
      },
    });
  } catch (error) {
    next(new ErrorHandler(error.message, 500));
  }
};

//
