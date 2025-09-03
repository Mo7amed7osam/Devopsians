import { response } from 'express';
import User from '../models/userModel.js'; 
import ErrorHandler from '../utils/errorHandler.js';
import { jsontoken } from '../utils/token.js'; 
import jwt from 'jsonwebtoken';
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();


export const createUser = async (req, res, next) => {
    try {
        const {
            userName,
            firstName,
            lastName,
            userPass,
            gender,
            phone,
            role,
            email,
            currentCondition,
            admissionDate,
            medicalHistory,
            assignedHospital,
            assignedManagers,
            assignedDepartments,
            doctorDepartment,
            shifts,
        } = req.body;

        if (!userName || !firstName || !lastName || !userPass || !gender || !phone || !role) {
            return res.status(400).json({ message: "All required fields must be filled" });
        }

        const isRegistered = await User.findOne({ userName });
        if (isRegistered) {
            return res.status(400).json({ message: "User is already registered" });
        }

        // Ensure assignedHospital is only set for roles that require it
        const user = await User.create({
            userName,
            firstName,
            lastName,
            userPass,
            gender,
            phone,
            role,
            email,
            currentCondition: role === "Patient" ? currentCondition : undefined,
            admissionDate: role === "Patient" ? admissionDate : undefined,
            medicalHistory: role === "Patient" ? medicalHistory : undefined,
            assignedHospital: role === "Receptionist" ? assignedHospital : undefined,
            assignedManagers: role === "Admin" ? assignedManagers : undefined,
            assignedDepartments: role === "Manager" ? assignedDepartments : undefined,
            doctorDepartment: role === "Doctor" ? doctorDepartment : undefined,
            shifts: ["Doctor", "Nurse", "Cleaner", "Receptionist"].includes(role) ? shifts : undefined,
        });

        // Use the organization's token utility function
        jsontoken(user, "User created successfully", 201, res);
    } catch (error) {
        console.error(error);
        next(new ErrorHandler("Server error", 500));
    }
};

export const loginUser = async (req, res, next) => {
    try {
        const { userName, password, role } = req.body;

        if (!userName || !password || !role) {
            return next(new ErrorHandler("Please fill out the full form", 400));
        }

        const user = await User.findOne({ userName }).select("+userPass");
        if (!user) {
            return next(new ErrorHandler("Invalid Username or Password", 404));
        }

        const passwordMatch = await user.comparePassword(password);
        if (!passwordMatch) {
            return next(new ErrorHandler("Invalid Username or Password", 404));
        }

        if (role !== user.role) {
            return next(new ErrorHandler("Role does not match the provided role", 403));
        }

        // Exclude the password from the user data before sending it
        const userData = {
            id: user._id, // Include user ID
            userName: user.userName,
            role: user.role, // Add other relevant fields if needed
        };

        // Use the organization's token utility function
        const token = jsontoken(userData, "User Login Successfully", 200, res);

        // Send the token and user data to the frontend
        res.status(200).json({
            success: true,
            message: "User Login Successfully",
            token,
            user: userData, // Include user ID in the response
        });

    } catch (error) {
        console.error(error);
        next(new ErrorHandler("Server error", 500));
    }
};




//   export const verifyToken = async (req, res) => {
//     const token = req.headers["Authorization"]?.split(" ")[1]; // Extract token from Authorization header
  
//     if (!token) {
//       return res.status(401).json({ message: "No token provided" });
//     }
  
//     try {
//       const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY); // Verify token with your secret
//       const user = await User.findById(decoded.userId); // Find user by ID stored in the token
  
//       if (!user) {
//         return res.status(404).json({ message: "User not found" });
//       }
  
//       res.status(200).json({ role: user.role }); // Return user's role
//     } catch (error) {
//       console.error("Token verification error:", error);
//       res.status(401).json({ message: "Invalid token" });
//     }
//   }

export const verifyToken = async (req, res) => {
    const token = req.body.token;
  
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
  
    // Verify the token (using your authentication logic)
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Invalid token" });
      }
  
      // Token is valid
      res.status(200).json({ message: "Token verified", role: decoded.role });
    });
  }


// app.post("/user/verify-token", (req, res) => {
//         const token = req.body.token;
      
//         if (!token) {
//           return res.status(401).json({ message: "No token provided" });
//         }
      
//         // Verify the token (using your authentication logic)
//         jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
//           if (err) {
//             return res.status(401).json({ message: "Invalid token" });
//           }
      
//           // Token is valid
//           res.status(200).json({ message: "Token verified", role: decoded.role });
//         });
//       });
      
//logout user, update user

export const updateUser = async (userId, updates) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true });
        return updatedUser;
    } catch (err) {
        console.error(`Error updating user with ID ${userId}:`, err);
        throw new Error('Failed to update user.');
    }
};


export const updateMedicalDetails = async (req, res) => {
    const { userId } = req.params;
    const { currentCondition, medicalHistory } = req.body;

    try {
        // Prepare the update payload
        const updates = {};
        if (currentCondition) updates.currentCondition = currentCondition;
        if (medicalHistory) updates.medicalHistory = medicalHistory;

        // Call the updateUser service function
        const updatedUser = await updateUser(userId, updates);

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "Medical details updated successfully",
            user: updatedUser,
        });
    } catch (err) {
        console.error("Error updating medical details:", err);
        res.status(500).json({ message: "Failed to update medical details" });
    }
};
export const showUserDetails = async (req, res, next) => {
    const { userId } = req.params; // Extract user ID from route parameters
  
    try {
      // Find the user by ID
      const user = await User.findById(userId);
      
      // Check if user exists
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      // If the user is found, return their details
      res.status(200).json({
        success: true,
        user
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
      next(new ErrorHandler("Server error", 500));
    }
  };
const transporter = nodemailer.createTransport({
    service:"gmail",
    port: 465,
    logger: true,
    debug: true,
    secureConnection: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, 
    },
    tls:{
      rejectUnauthorized:true
    }
  });
export const sendemail = async (req, res, next) => {
    const { email, name } = req.body;
  
    if (!email || !name) {
      return res.status(400).json({ error: "Missing email or name" });
    }
  
    const mailOptions = {
      from: `OpenJavaScript <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to Our Service!",
      text: `Hello ${name},\n\nThank you for registering! We're excited to have you onboard.\n\nBest regards,\nYour Team`,
      html: `<p>Hello ${name},</p><p>Thank you for registering! We're excited to have you onboard.</p><p>Best regards,<br>Your Team</p>`
    };    
  
    try {
      await transporter.sendMail(mailOptions);
      res.status(200).json({ message: "Email sent successfully!" });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  };