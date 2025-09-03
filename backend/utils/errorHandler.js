
class ErrorHandler extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Centralized error handling middleware
const errorHandler = (err, req, res, next) => {
    const { message, statusCode } = err;
    res.status(statusCode || 500).json({
        success: false,
        message: message || "An unexpected error occurred.",
    });
};

export { ErrorHandler, errorHandler };

export default ErrorHandler;