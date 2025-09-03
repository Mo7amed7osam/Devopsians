import jwt from "jsonwebtoken";

export const jsontoken = (user, message, statusCode, res) => {
  // Generate JWT token
  const token = jwt.sign(
    { id: user._id, role: user.role }, // Payload
    process.env.JWT_SECRET_KEY,           // Secret key
    { expiresIn: process.env.JWT_EXPIRE || "1d" } // Token expiration
  );

  // Determine the cookie name based on the user's role
  let cookieName;
  switch (user.role) {
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
    case "Nurse":
      cookieName = "nurseToken";
      break;
    case "Cleaner":
      cookieName = "cleanerToken";
      break;
    case "Receptionist":
      cookieName = "receptionistToken";
      break;
    default:
      throw new Error("Invalid user role"); // Handle unexpected roles
  }

  // Ensure COOKIE_EXPIRE is a valid number (fallback to 1 day if invalid or undefined)
  const cookieExpireDays = Number(process.env.COOKIE_EXPIRE) || 1; // Default to 1 day if not set

  // Set the cookie and respond
  res
    .status(statusCode)
    .cookie(cookieName, token, {
      expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000), // Expires in cookieExpireDays days
      httpOnly: true, // Secure cookie, not accessible via JavaScript
      secure: process.env.NODE_ENV === "production", // Only set the cookie over HTTPS in production
      sameSite: "Strict", // Prevent CSRF attacks
    })
    .json({
      success: true,
      message,
      user, // Optionally include user details in the response
      token, // Include the token in the response
    });
};
