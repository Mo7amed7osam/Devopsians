
class ErrorHandler extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Centralized error handling middleware
const errorHandler = (err, req, res, next) => {
    // Basic logging for visibility during development
    // eslint-disable-next-line no-console
    console.error('Error:', err && (err.stack || err));

    // Mongoose Validation Error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors || {}).map((e) => e.message);
        return res.status(400).json({
            success: false,
            message: messages.join(', ') || 'Validation error',
        });
    }

    // Duplicate key error (e.g., unique index on email or userName)
    if (err.code === 11000) {
        const fields = Object.keys(err.keyValue || {});
        const fieldList = fields.length ? fields.join(', ') : 'field';
        return res.status(400).json({
            success: false,
            message: `Duplicate ${fieldList}: already exists`,
        });
    }

    const { message, statusCode } = err;
    return res.status(statusCode || 500).json({
        success: false,
        message: message || 'An unexpected error occurred.',
    });
};

export { ErrorHandler, errorHandler };

export default ErrorHandler;