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
        } = req.body;

    if (!userName || !firstName || !lastName || !userPass || !gender || !phone || !role || !email) {
      return res.status(400).json({ message: "All required fields must be filled" });
        }

    // Check for duplicate username or email early to return a clear 400
    const existingUser = await User.findOne({ $or: [{ userName }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: "Username or email is already registered" });
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
            status: role === "Ambulance" ? "AVAILABLE" : undefined,
        });

        // Use the organization's token utility function
    jsontoken(user, "User created successfully", 201, res);
    } catch (error) {
    console.error(error);
    next(error); // Let centralized error handler map validation/duplicate correctly
    }
};

export const loginUser = async (req, res, next) => {
  try {
    const { userName, email, password } = req.body;

    console.log('Login attempt:', { userName, email, passwordLength: password?.length });

    if ((!userName && !email) || !password) {
      return next(new ErrorHandler("Please provide email or username and password", 400));
    }

    const query = email ? { email } : { userName };
    console.log('Query:', query);
    
    const user = await User.findOne(query).select("+userPass");
    console.log('User found:', user ? `Yes (${user.email})` : 'No');
    
    if (!user) {
      return next(new ErrorHandler("Invalid credentials", 401));
    }

    const passwordMatch = await user.comparePassword(password);
    console.log('Password match:', passwordMatch);
    
    if (!passwordMatch) {
      return next(new ErrorHandler("Invalid credentials", 401));
    }

    // Issue token and respond via shared utility with full user doc
    jsontoken(user, "User Login Successfully", 200, res);
    return;

  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};
export const verifyToken = async (req, res) => {
    const token = req.body.token;
  
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
  
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Invalid token" });
      }
  
      res.status(200).json({ message: "Token verified", role: decoded.role });
    });
  }
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