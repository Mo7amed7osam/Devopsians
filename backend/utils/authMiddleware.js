import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import ErrorHandler from '../utils/errorHandler.js';

// Middleware to check authentication
export const isAuthenticated = async (req, res, next) => {
    try {
        const { token } = req.cookies;

        if (!token) {
            return next(new ErrorHandler("Not authenticated. Please log in.", 401));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);

        next();
    } catch (error) {
        next(new ErrorHandler("Authentication failed", 401));
    }
};

// Middleware to restrict roles
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new ErrorHandler(`Role: ${req.user.role} is not authorized to access this resource`, 403));
        }
        next();
    };
};
