import { ErrorHandler } from "../utils/errorHandler.js";
import Hospital from "../models/hospitalmodel.js";
import { ICU } from "../models/roomModel.js";
import User from "../models/userModel.js";
import Feedback from "../models/feedbackModel.js";
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
      // Use aggregation to perform geoNear and populate assignedManager via $lookup
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
        // Lookup assignedManager from users collection
        {
          $lookup: {
            from: 'users',
            localField: 'assignedManager',
            foreignField: '_id',
            as: 'assignedManager',
          },
        },
        // unwind so assignedManager is an object (or null)
        {
          $unwind: {
            path: '$assignedManager',
            preserveNullAndEmptyArrays: true,
          },
        },
        { $sort: { distance: 1 } }, // Sort by nearest
      ]);
    } else {
      hospitals = await Hospital.find(query).populate('assignedManager', 'firstName lastName email');
    }

    res.status(200).json({ hospitals });
  } catch (error) {
    next(new ErrorHandler(error.message, 500));
  }
};

// Public endpoint to view nearby hospitals (no authentication required)
export const viewNearbyHospitalsPublic = async (req, res, next) => {
  try {
    const { longitude, latitude, maxDistance = 50000 } = req.query; // maxDistance in meters (default 50km)

    if (!longitude || !latitude) {
      return next(new ErrorHandler("Longitude and latitude are required", 400));
    }

    // Use aggregation to perform geoNear for nearby hospitals
    const hospitals = await Hospital.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          distanceField: "distance",
          maxDistance: parseInt(maxDistance),
          spherical: true,
        },
      },
      {
        $match: { status: "Active" }, // Only return active hospitals
      },
      {
        $project: {
          name: 1,
          address: 1,
          email: 1,
          contactNumber: 1,
          location: 1,
          distance: 1,
          status: 1,
        },
      },
      { $sort: { distance: 1 } }, // Sort by nearest
    ]);

    res.status(200).json({ 
      success: true,
      count: hospitals.length,
      hospitals 
    });
  } catch (error) {
    next(new ErrorHandler(error.message, 500));
  }
};

export const assignManager = async (req, res, next) => {
  try {
    // Support both patterns: hospital id in params or in request body
    const hospitalId = req.params?.id || req.body?.hospitalId || req.body?.id;
    const { managerId } = req.body;

    if (!managerId) {
      return next(new ErrorHandler("Manager ID is required.", 400));
    }

    // Use findById to locate the manager by id
    const user = await User.findById(managerId);

    if (!user) {
      return next(new ErrorHandler("Manager not found.", 404));
    }

    if (user.role !== "Manager") {
      return next(new ErrorHandler("Only Managers can be assigned", 403));
    }

    if (!hospitalId) {
      return next(new ErrorHandler("Hospital ID is required.", 400));
    }

    const hospital = await Hospital.findByIdAndUpdate(
      hospitalId,
      { assignedManager: managerId },
      { new: true }
    ).populate("assignedManager", "firstName lastName email");

    if (!hospital) {
      return next(new ErrorHandler("Hospital not found.", 404));
    }

    // Also ensure the manager user document references this hospital for two-way consistency
    try {
      const managerUser = await User.findById(managerId).select('+userPass');
      if (managerUser) {
        managerUser.hospitalId = managerUser.hospitalId && Array.isArray(managerUser.hospitalId)
          ? Array.from(new Set([...managerUser.hospitalId.map(String), String(hospital._id)])).map(id => id)
          : [hospital._id];
        await managerUser.save();
      }
    } catch (err) {
      // Non-fatal: log and continue
      console.warn('Failed to update manager user with hospitalId:', err.message || err);
    }

    res.status(200).json({ message: "Manager assigned successfully.", hospital });
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
    
  const updatedICUs = await ICU.find({ status: { $regex: '^available$', $options: 'i' } }).populate('hospital', 'name address').exec();
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

  const updatedICUs = await ICU.find({ status: { $regex: '^available$', $options: 'i' } }).populate('hospital', 'name address').exec();
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

/**
 * Unified user creation helper.
 * Supports roles: 'Manager' and 'Admin'.
 * - Manager requires: firstName, lastName, userName, password
 * - Admin requires: firstName, lastName, email, password
 */
const createUserWithRole = async (req, res, next, role) => {
  try {
    const { firstName, lastName, userName, email, password } = req.body;

    // Basic required fields for all roles
    if (!firstName || !lastName || !password) {
      return next(new ErrorHandler('All fields are required', 400));
    }

    // Role-specific validation
    if (role === 'Manager' && !userName) {
      return next(new ErrorHandler('userName is required for Manager', 400));
    }
    if (role === 'Admin' && !email) {
      return next(new ErrorHandler('email is required for Admin', 400));
    }

    // Check if username or email already exists
    let existingUser = null;
    if (userName) existingUser = await User.findOne({ userName });
    if (!existingUser && email) existingUser = await User.findOne({ email });
    if (existingUser) return next(new ErrorHandler('User already exists', 400));

    // Don't hash the password here - let the User model's pre-save hook handle it
    const payload = {
      firstName,
      lastName,
      userPass: password, // Store plain password, model will hash it
      role,
    };
    // supply defaults for required User fields if not provided
    if (!req.body.gender) payload.gender = 'Male';
    if (!req.body.phone) payload.phone = '0000000000';
    if (userName) payload.userName = userName;
    if (email) payload.email = email;

    const newUser = new User(payload);
    await newUser.save(); // pre-save hook will hash the password

    res.status(201).json({
      success: true,
      message: `${role} account created successfully`,
      data: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('createUserWithRole error:', error);
    next(new ErrorHandler(error.message, 500));
  }
};

export const createManagerAccount = async (req, res, next) => {
  try {
    const { firstName, lastName, userName, password, email, hospitalId } = req.body;

    // Validate required fields for manager
    if (!firstName || !lastName || !userName || !password) {
      return next(new ErrorHandler('All fields are required for Manager', 400));
    }

    // Check if username or email already exists
    let existingUser = await User.findOne({ userName });
    if (!existingUser && email) existingUser = await User.findOne({ email });
    if (existingUser) return next(new ErrorHandler('User already exists', 400));

    // Don't hash the password here - let the User model's pre-save hook handle it
    const newUser = new User({
      firstName,
      lastName,
      userName,
      email: email || undefined,
      userPass: password, // Store plain password, model will hash it
      // fill required fields with sensible defaults if missing
      gender: req.body.gender || 'Male',
      phone: req.body.phone || '0000000000',
      role: 'Manager',
    });

    await newUser.save(); // pre-save hook will hash the password

    let assignedHospital = null;
    // If hospitalId provided, attempt to assign the created manager
    if (hospitalId) {
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) {
        // If hospital does not exist, respond with created manager but warn
        return res.status(201).json({
          success: true,
          message: 'Manager created but hospital not found to assign',
          data: {
            id: newUser._id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email,
            role: newUser.role,
          },
        });
      }
      hospital.assignedManager = newUser._id;
      assignedHospital = await hospital.save();

      // Also record the hospital on the manager user for two-way consistency.
      // The User model stores hospitalId (array) for admins; we'll add the assigned
      // hospital id to that array for managers so the manager document reflects
      // the hospital assignment as well.
      try {
        newUser.hospitalId = newUser.hospitalId && Array.isArray(newUser.hospitalId)
          ? Array.from(new Set([...newUser.hospitalId.map(String), String(assignedHospital._id)])).map(id => id)
          : [assignedHospital._id];
        await newUser.save();
      } catch (err) {
        // Non-fatal: if saving the user fails, log but continue returning success for hospital assignment
        console.warn('Failed to persist hospitalId on manager user:', err.message || err);
      }
    }

    // Return manager info (and assigned hospital if applicable)
    return res.status(201).json({
      success: true,
      message: 'Manager account created successfully',
      data: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        assignedHospital: assignedHospital ? { id: assignedHospital._id, name: assignedHospital.name } : null,
      },
    });
  } catch (error) {
    console.error('createManagerAccount error:', error);
    next(new ErrorHandler(error.message, 500));
  }
};

export const createAdminAccount = async (req, res, next) =>
  createUserWithRole(req, res, next, 'Admin');

/**
 * Admin: Create user with any role
 * Supports: Admin, Manager, Receptionist, Ambulance, Patient
 */
export const createUser = async (req, res, next) => {
  try {
    const { firstName, lastName, userName, email, password, role, phone, gender, assignedHospital } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !password || !role) {
      return next(new ErrorHandler('firstName, lastName, password, and role are required', 400));
    }

    // Validate role
    const validRoles = ['Admin', 'Manager', 'Receptionist', 'Ambulance', 'Patient'];
    if (!validRoles.includes(role)) {
      return next(new ErrorHandler('Invalid role. Must be: Admin, Manager, Receptionist, Ambulance, or Patient', 400));
    }

    // Check if user already exists
    let existingUser = null;
    if (userName) existingUser = await User.findOne({ userName });
    if (!existingUser && email) existingUser = await User.findOne({ email });
    if (existingUser) return next(new ErrorHandler('User already exists', 400));

    // Build user payload
    const userPayload = {
      firstName,
      lastName,
      userPass: password,
      role,
      gender: gender || 'Male',
      phone: phone || '0000000000',
    };

    // Add optional fields
    if (userName) userPayload.userName = userName;
    if (email) userPayload.email = email;
    if (assignedHospital) userPayload.assignedHospital = assignedHospital;

    // Create user
    const newUser = new User(userPayload);
    await newUser.save();

    res.status(201).json({
      success: true,
      message: `${role} account created successfully`,
      data: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        userName: newUser.userName,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('createUser error:', error);
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

// Admin: update user details
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    // Allowed non-sensitive fields
    const allowed = ['firstName', 'lastName', 'email', 'phone', 'role', 'isBlocked'];

    // Normalize role casing if provided (be forgiving of lowercase client input)
    if (updates.role && typeof updates.role === 'string') {
      const roleMap = {
        admin: 'Admin',
        manager: 'Manager',
        doctor: 'Doctor',
        receptionist: 'Receptionist',
        ambulance: 'Ambulance',
        patient: 'Patient',
      };
      const candidate = updates.role;
      const normalized = roleMap[candidate.toLowerCase()] || candidate;
      // If normalized is not one of the allowed enum values, reject early
      const allowedRoles = Object.values(roleMap);
      if (!allowedRoles.includes(normalized)) {
        return next(new ErrorHandler('Invalid role value provided', 400));
      }
      updates.role = normalized;
    }

    // Find user and apply updates (so pre-save middleware runs for password hashing)
    const user = await User.findById(id).select('+userPass');
    if (!user) return next(new ErrorHandler('User not found', 404));

    // Apply allowed fields
    Object.keys(updates).forEach(k => {
      if (allowed.includes(k)) user[k] = updates[k];
    });

    // Handle password update explicitly (frontend sends `password`)
    if (updates.password) {
      if (typeof updates.password !== 'string' || updates.password.length < 6) {
        return next(new ErrorHandler('Password must be at least 6 characters', 400));
      }
      // Hash and set userPass so pre-save hashing isn't duplicated
      const hashed = await bcrypt.hash(updates.password, 10);
      user.userPass = hashed;
    }

    try {
      await user.save();
    } catch (saveErr) {
      // If validation failed, return 400 with friendly message
      if (saveErr && saveErr.name === 'ValidationError') {
        return next(new ErrorHandler(saveErr.message, 400));
      }
      // otherwise rethrow
      throw saveErr;
    }

    const safeUser = user.toObject();
    delete safeUser.userPass;
    res.status(200).json({ success: true, message: 'User updated', data: safeUser });
  } catch (err) {
    next(new ErrorHandler(err.message, 500));
  }
};

// Admin: delete a user
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id).select('-userPass');
    if (!user) return next(new ErrorHandler('User not found', 404));
    res.status(200).json({ success: true, message: 'User deleted', data: user });
  } catch (err) {
    next(new ErrorHandler(err.message, 500));
  }
};

// Admin: block user
export const blockUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { isBlocked: true }, { new: true }).select('-userPass');
    if (!user) return next(new ErrorHandler('User not found', 404));
    res.status(200).json({ success: true, message: 'User blocked', data: user });
  } catch (err) {
    next(new ErrorHandler(err.message, 500));
  }
};

// Admin: unblock user
export const unblockUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { isBlocked: false }, { new: true }).select('-userPass');
    if (!user) return next(new ErrorHandler('User not found', 404));
    res.status(200).json({ success: true, message: 'User unblocked', data: user });
  } catch (err) {
    next(new ErrorHandler(err.message, 500));
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
