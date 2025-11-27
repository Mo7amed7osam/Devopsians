import jwt from "jsonwebtoken";

export const jsontoken = (user, message, statusCode, res) => {
  // Normalize id and role from either full Mongoose doc or a lean object
  const id = user?._id || user?.id;
  const role = user?.role;

  // Generate JWT token
  const token = jwt.sign(
    { id, role }, // Payload
    process.env.JWT_SECRET_KEY,           // Secret key
    { expiresIn: process.env.JWT_EXPIRES || process.env.JWT_EXPIRE || "1d" } // Token expiration
  );

  // Determine the cookie name based on the user's role
  let cookieName;
  switch (role) {
    case "Admin":
      cookieName = "adminToken";
      break;
    case "Doctor":
      cookieName = "doctorToken";
      break;
    case "Manager":
      cookieName = "managerToken";
      break;
    case "Patient":
      cookieName = "patientToken";
      break;
    case "Receptionist":
      cookieName = "receptionistToken";
      break;
    case "Ambulance":
      cookieName = "ambulanceToken";
      break;
    default:
      throw new Error("Invalid user role"); // Handle unexpected roles
  }

  // Ensure COOKIE_EXPIRE is a valid number (fallback to 1 day if invalid or undefined)
  const cookieExpireDays = Number(process.env.COOKIE_EXPIRE) || 1; // Default to 1 day if not set

  // Determine if we're in production/HTTPS environment
  const isSecure = process.env.NODE_ENV === "production" || process.env.SECURE_COOKIES === "true";

  // Set the cookie and respond
  res
    .status(statusCode)
    .cookie(cookieName, token, {
      expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000), // Expires in cookieExpireDays days
      httpOnly: true, // Secure cookie, not accessible via JavaScript
      secure: isSecure, // Only set secure flag when using HTTPS
      sameSite: isSecure ? "Strict" : "Lax", // Use Lax for HTTP, Strict for HTTPS
    })
    .json({
      success: true,
      message,
      role, // Provide top-level role for convenience in frontend
      user, // Optionally include user details in the response
      token, // Include the token in the response
    });
};
