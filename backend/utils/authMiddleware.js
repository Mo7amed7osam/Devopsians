import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import ErrorHandler from '../utils/errorHandler.js';

// Middleware to check authentication
export const isAuthenticated = async (req, res, next) => {
    try {
        // Support different cookie names (legacy and role-based)
        const cookieCandidates = [
            'token',
            'adminToken',
            'doctorToken',
            'managerToken',
            'patientToken',
            'receptionistToken',
            'ambulanceToken'
        ];

        let token;
        for (const name of cookieCandidates) {
            if (req.cookies && req.cookies[name]) {
                token = req.cookies[name];
                break;
            }
        }

        if (!token) {
            return next(new ErrorHandler('Not authenticated. Please log in.', 401));
        }

        const secret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;
        if (!secret) {
            return next(new ErrorHandler('Server misconfiguration: JWT secret is missing', 500));
        }

        const decoded = jwt.verify(token, secret);
        req.user = await User.findById(decoded.id);

        if (!req.user) return next(new ErrorHandler('User not found', 401));

        next();
    } catch (error) {
        next(new ErrorHandler('Authentication failed', 401));
    }
};

// Middleware to restrict roles
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new ErrorHandler(`Role: ${req.user?.role} is not authorized to access this resource`, 403));
        }
        next();
    };
};
