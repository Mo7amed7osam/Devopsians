import Hospital from "../models/hospitalmodel.js";
import { ICU } from "../models/roomModel.js";
import User from "../models/userModel.js";
import Service from "../models/serviceModel.js";
import ErrorHandler from "../utils/errorHandler.js";
import { io } from "../index.js";

// Get manager's assigned hospital
export const getMyHospital = async (req, res, next) => {
  try {
    const managerId = req.user.id; // From auth middleware

    // Find hospital where this manager is assigned
    const hospital = await Hospital.findOne({ assignedManager: managerId })
      .select('name address email location contactNumber status');

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: "No hospital assigned to this manager",
        data: null
      });
    }

    res.status(200).json({
      success: true,
      message: "Hospital info retrieved successfully",
      data: hospital,
    });
  } catch (error) {
    next(new ErrorHandler(error.message, 500));
  }
};

export const assignBackupManager = async (req, res, next) => {
  try {
    const { hospitalId, backupManagerId } = req.body;

    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return next(new ErrorHandler("Hospital not found", 404));
    }

    const backupManager = await User.findById(backupManagerId);
    if (!backupManager || backupManager.role !== "Manager") {
      return next(
        new ErrorHandler("Backup Manager not found or is not a Manager", 404)
      );
    }

    hospital.backupManager = backupManagerId;
    await hospital.save();

    res.status(200).json({
      success: true,
      message: "Backup manager assigned successfully",
    });
  } catch (error) {
    next(new ErrorHandler(error.message, 500));
  }
};

export const registerICU = async (req, res, next) => {
  try {
    const managerId = req.user.id; // Get manager ID from auth middleware
    const { specialization, status, fees, isReserved, reservedBy, room, capacity } =
      req.body;

    // Find the hospital assigned to this manager
    const hospital = await Hospital.findOne({ assignedManager: managerId });
    if (!hospital) {
      return next(new ErrorHandler("No hospital assigned to this manager", 404));
    }

    if (!specialization || !status || fees === undefined || !room || capacity === undefined) {
      return next(
        new ErrorHandler("Specialization, status, fees, room and capacity are required", 400)
      );
    }

    const icuData = {
      hospital: hospital._id, // Use the manager's assigned hospital
      specialization,
      room,
      capacity: Number(capacity),
      status,
      fees,
      isReserved,
      reservedBy,
    };

    const newICU = new ICU(icuData);
    await newICU.save();

    const updatedICUs = await ICU.find({ status: { $regex: '^available$', $options: 'i' } })
      .populate("hospital", "name address")
      .exec();

    io.emit("icuUpdated", updatedICUs);

    res.status(201).json({
      success: true,
      message: "ICU registered successfully",
      data: newICU,
    });
  } catch (error) {
    next(
      new ErrorHandler(`Error while registering ICU: ${error.message}`, 500)
    );
  }
};

export const deleteICU = async (req, res, next) => {
  try {
    const { icuId } = req.params;

    const icu = await ICU.findByIdAndDelete(icuId);
    if (!icu) {
      return next(new ErrorHandler("ICU not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "ICU deleted successfully",
    });
  } catch (error) {
    next(new ErrorHandler(`Error while deleting ICU: ${error.message}`, 500));
  }
};

export const updateICU = async (req, res, next) => {
  try {
    const { icuId } = req.params;
    const updates = req.body;

    const icu = await ICU.findByIdAndUpdate(icuId, updates, { new: true }).populate('hospital', 'name');
    if (!icu) {
      return next(new ErrorHandler("ICU not found", 404));
    }

    // Emit real-time socket event for ICU status update
    if (io && updates.status) {
      const eventData = {
        icuId: icu._id,
        hospitalId: icu.hospital?._id,
        hospitalName: icu.hospital?.name,
        newStatus: updates.status,
        specialization: icu.specialization,
        room: icu.room,
        timestamp: new Date()
      };
      console.log('🟡 [Socket] Emitting icuStatusUpdate event:', eventData);
      io.emit('icuStatusUpdate', eventData);
    } else if (!io) {
      console.warn('⚠️ Socket.IO instance not available for icuStatusUpdate event');
    }

    res.status(200).json({
      success: true,
      message: "ICU updated successfully",
      data: icu,
    });
  } catch (error) {
    next(new ErrorHandler(`Error while updating ICU: ${error.message}`, 500));
  }
};

export const viewICUs = async (req, res, next) => {
  try {
    const managerId = req.user.id; // Get manager ID from auth middleware
    const { specialization } = req.query;

    // Find the hospital assigned to this manager
    const hospital = await Hospital.findOne({ assignedManager: managerId });
    if (!hospital) {
      return next(new ErrorHandler("No hospital assigned to this manager", 404));
    }

    // Build query to filter by manager's hospital
    let query = { hospital: hospital._id };
    
    if (specialization) {
      query.specialization = specialization;
    }

    const icus = await ICU.find(query).populate("hospital", "name address");

    if (icus.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No ICUs found for your hospital",
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      message: "ICUs fetched successfully",
      data: icus,
    });
  } catch (error) {
    next(new ErrorHandler(`Error while fetching ICUs: ${error.message}`, 500));
  }
};

export const addEmployee = async (req, res, next) => {
  try {
    // Correctly access managerId from the request (modify if needed)
    const { managerId } = req.body; // Assuming managerId is sent in the request body

    const {
      firstName,
      lastName,
      userName,
      role,
      email,
      phone,
      userPass,
      gender,
    } = req.body;

    const existingEmployee = await User.findOne({ userName });
    if (existingEmployee) {
      return next(new ErrorHandler("Username already exists", 400));
    }

    // Check if manager exists (optional)
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== "Manager") {
      return next(new ErrorHandler("Invalid manager ID or role", 400)); // Adjust error message as needed
    }

    const newEmployee = new User({
      firstName,
      lastName,
      userName,
      email,
      phone,
      userPass,
      role,
      gender,
      assignedManager: managerId, // Add the manager ID
    });

    await newEmployee.save();

    res.status(201).json({
      success: true,
      message: "Employee added successfully",
      data: newEmployee,
    });
  } catch (error) {
    next(new ErrorHandler(error.message, 500));
  }
};

export const removeEmployee = async (req, res, next) => {
  try {
    const { id } = req.body; // Extract employee ID from URL params

    // Correct query to find employee by _id
    const employee = await User.findById(id);
    console.log("Received ID:", id);
    if (!employee) {
      return next(new ErrorHandler("Employee not found", 404));
    }

    await User.deleteOne({ _id: id }); // Remove the employee

    res.status(200).json({
      success: true,
      message: "Employee removed successfully",
    });
  } catch (error) {
    next(new ErrorHandler(error.message, 500));
  }
};

export const trackEmployeeTasks = async (req, res, next) => {
  try {
    const { useCaseName } = req.query;

    const employees = await User.find({ role: useCaseName });
    if (employees.length === 0) {
      return next(
        new ErrorHandler("No employees found for the given use case name", 404)
      );
    }

    const employeeIds = employees.map((employee) => employee._id);

    const tasks = await Task.find({
      assignedTo: { $in: employeeIds },
    }).populate("assignedTo", "firstName lastName role");

    if (tasks.length === 0) {
      return next(new ErrorHandler("No tasks found for the employees", 404));
    }

    res.status(200).json({
      success: true,
      message: "Tasks tracked successfully",
      data: tasks,
    });
  } catch (error) {
    next(
      new ErrorHandler(
        `Error while tracking employee tasks: ${error.message}`,
        500
      )
    );
  }
};

export const createAndAssignTask = async (req, res, next) => {
  try {
    const { name, employeeId, deadLine, priority, status } = req.body;

    if (!name || !employeeId || !deadLine || !priority || !status) {
      return next(new ErrorHandler("All fields are required.", 400));
    }

    const employee = await User.findById(employeeId);
    if (
      !employee ||
      !["Doctor", "Receptionist", "Ambulance"].includes(employee.role)
    ) {
      return next(
        new ErrorHandler(
          "Employee not found or is not eligible for tasks.",
          404
        )
      );
    }

    const task = new Task({
      name,
      assignedTo: employeeId,
      deadLine,
      priority,
      status,
    });

    await task.save();

    res.status(201).json({
      success: true,
      message: "Task created and assigned successfully",
      data: task,
    });
  } catch (error) {
    next(
      new ErrorHandler(
        `Error while creating and assigning task: ${error.message}`,
        500
      )
    );
  }
};

export const registerVisitorRoom = async (req, res, next) => {
  try {
    const { hospitalId, capacity, roomType } = req.body;

    if (!hospitalId || !capacity || !roomType) {
      return next(new ErrorHandler("All fields are required", 400));
    }

    const hospital = await mongoose.model("Hospital").findById(hospitalId);
    if (!hospital) {
      return next(new ErrorHandler("Hospital not found", 404));
    }

    const visitorRoomData = {
      hospital: hospitalId,
      capacity,
      roomType,
    };

    const newVisitorRoom = new VisitorRoom(visitorRoomData);

    await newVisitorRoom.save();

    res.status(201).json({
      success: true,
      message: "Visitor room registered successfully",
      data: newVisitorRoom,
    });
  } catch (error) {
    next(
      new ErrorHandler(
        `Error while registering visitor room: ${error.message}`,
        500
      )
    );
  }
};

export const calculateFees = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Find all services reserved by the user
    const services = await Service.find({ reservedBy: userId });
    if (!services || services.length === 0) {
      return next(new ErrorHandler("No services found for this user", 404));
    }

    // Calculate the total fees
    const totalFees = services.reduce(
      (total, service) => total + service.fee,
      0
    );

    res.status(200).json({
      success: true,
      message: "Fees calculated successfully",
      data: { totalFees },
    });
  } catch (error) {
    next(
      new ErrorHandler(`Error while calculating fees: ${error.message}`, 500)
    );
  }
};

export const viewAllEmployees = async (req, res) => {
  try {
    // Correctly access managerId from params
    const { managerId } = req.params;

    // Fetch the manager from the database
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== "Manager") {
      return res.status(403).json({
        message: "Unauthorized: Only managers can access this information.",
      });
    }

    // Fetch the assigned employees
    const assignedEmployees = await User.find(
      { assignedManager: managerId },
      "userName firstName lastName department role email"
    );

    if (!assignedEmployees || assignedEmployees.length === 0) {
      return res
        .status(404)
        .json({ message: "No employees assigned to this manager." });
    }

    // Return the employees data
    res.status(200).json({
      message: "Employees assigned to this manager retrieved successfully.",
      employees: assignedEmployees,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const viewICUById = async (req, res, next) => {
  try {
    const { icuId } = req.params;

    // Find the ICU room by ID
    const icuRoom = await ICU.findById(icuId).populate("hospital reservedBy");
    if (!icuRoom) {
      return next(new ErrorHandler("ICU room not found", 404));
    }

    res.status(200).json({
      success: true,
      data: icuRoom,
    });
  } catch (error) {
    next(
      new ErrorHandler(`Error while fetching ICU room: ${error.message}`, 500)
    );
  }
};

// Create Receptionist for Manager's Hospital
export const createReceptionist = async (req, res, next) => {
  try {
    const managerId = req.user.id; // From auth middleware
    const { userName, firstName, lastName, email, phone, gender, userPass } = req.body;

    // Validate required fields
    if (!userName || !firstName || !lastName || !email || !phone || !gender || !userPass) {
      return next(new ErrorHandler("All fields are required (userName, firstName, lastName, email, phone, gender, userPass)", 400));
    }

    // Find the hospital assigned to this manager
    const hospital = await Hospital.findOne({ assignedManager: managerId });
    if (!hospital) {
      return next(new ErrorHandler("No hospital assigned to this manager", 404));
    }

    // Check if user with same userName or email already exists
    const existingUser = await User.findOne({
      $or: [{ userName }, { email }]
    });
    if (existingUser) {
      return next(new ErrorHandler("Username or email already exists", 400));
    }

    // Create new receptionist
    const newReceptionist = new User({
      userName,
      firstName,
      lastName,
      email,
      phone,
      gender,
      userPass, // Will be hashed by pre-save hook in User model
      role: "Receptionist",
      assignedHospital: hospital._id,
      assignedManager: managerId
    });

    await newReceptionist.save();

    // Return success response without password
    res.status(201).json({
      success: true,
      message: "Receptionist created successfully",
      data: {
        id: newReceptionist._id,
        userName: newReceptionist.userName,
        firstName: newReceptionist.firstName,
        lastName: newReceptionist.lastName,
        email: newReceptionist.email,
        phone: newReceptionist.phone,
        gender: newReceptionist.gender,
        role: newReceptionist.role,
        assignedHospital: {
          id: hospital._id,
          name: hospital.name
        }
      }
    });
  } catch (error) {
    next(new ErrorHandler(`Error while creating receptionist: ${error.message}`, 500));
  }
};

// Get all receptionists for manager's hospital
export const getReceptionists = async (req, res, next) => {
  try {
    const managerId = req.user.id;

    // Find the hospital assigned to this manager
    const hospital = await Hospital.findOne({ assignedManager: managerId });
    if (!hospital) {
      return next(new ErrorHandler("No hospital assigned to this manager", 404));
    }

    // Find all receptionists assigned to this hospital
    const receptionists = await User.find({
      role: "Receptionist",
      assignedHospital: hospital._id
    }).select('-userPass -__v');

    res.status(200).json({
      success: true,
      message: "Receptionists retrieved successfully",
      count: receptionists.length,
      data: receptionists
    });
  } catch (error) {
    next(new ErrorHandler(`Error while fetching receptionists: ${error.message}`, 500));
  }
};

// Get single receptionist by ID
export const getReceptionistById = async (req, res, next) => {
  try {
    const managerId = req.user.id;
    const { receptionistId } = req.params;

    // Find the hospital assigned to this manager
    const hospital = await Hospital.findOne({ assignedManager: managerId });
    if (!hospital) {
      return next(new ErrorHandler("No hospital assigned to this manager", 404));
    }

    // Find receptionist and verify they belong to manager's hospital
    const receptionist = await User.findOne({
      _id: receptionistId,
      role: "Receptionist",
      assignedHospital: hospital._id
    }).select('-userPass -__v');

    if (!receptionist) {
      return next(new ErrorHandler("Receptionist not found or not assigned to your hospital", 404));
    }

    res.status(200).json({
      success: true,
      data: receptionist
    });
  } catch (error) {
    next(new ErrorHandler(`Error while fetching receptionist: ${error.message}`, 500));
  }
};

// Update receptionist
export const updateReceptionist = async (req, res, next) => {
  try {
    const managerId = req.user.id;
    const { receptionistId } = req.params;
    const { firstName, lastName, email, phone, gender } = req.body;

    // Find the hospital assigned to this manager
    const hospital = await Hospital.findOne({ assignedManager: managerId });
    if (!hospital) {
      return next(new ErrorHandler("No hospital assigned to this manager", 404));
    }

    // Find receptionist and verify they belong to manager's hospital
    const receptionist = await User.findOne({
      _id: receptionistId,
      role: "Receptionist",
      assignedHospital: hospital._id
    });

    if (!receptionist) {
      return next(new ErrorHandler("Receptionist not found or not assigned to your hospital", 404));
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== receptionist.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return next(new ErrorHandler("Email already exists", 400));
      }
    }

    // Update fields
    if (firstName) receptionist.firstName = firstName;
    if (lastName) receptionist.lastName = lastName;
    if (email) receptionist.email = email;
    if (phone) receptionist.phone = phone;
    if (gender) receptionist.gender = gender;

    await receptionist.save();

    res.status(200).json({
      success: true,
      message: "Receptionist updated successfully",
      data: {
        id: receptionist._id,
        userName: receptionist.userName,
        firstName: receptionist.firstName,
        lastName: receptionist.lastName,
        email: receptionist.email,
        phone: receptionist.phone,
        gender: receptionist.gender,
        role: receptionist.role
      }
    });
  } catch (error) {
    next(new ErrorHandler(`Error while updating receptionist: ${error.message}`, 500));
  }
};

// Delete receptionist
export const deleteReceptionist = async (req, res, next) => {
  try {
    const managerId = req.user.id;
    const { receptionistId } = req.params;

    // Find the hospital assigned to this manager
    const hospital = await Hospital.findOne({ assignedManager: managerId });
    if (!hospital) {
      return next(new ErrorHandler("No hospital assigned to this manager", 404));
    }

    // Find receptionist and verify they belong to manager's hospital
    const receptionist = await User.findOne({
      _id: receptionistId,
      role: "Receptionist",
      assignedHospital: hospital._id
    });

    if (!receptionist) {
      return next(new ErrorHandler("Receptionist not found or not assigned to your hospital", 404));
    }

    await User.findByIdAndDelete(receptionistId);

    res.status(200).json({
      success: true,
      message: "Receptionist deleted successfully"
    });
  } catch (error) {
    next(new ErrorHandler(`Error while deleting receptionist: ${error.message}`, 500));
  }
};
