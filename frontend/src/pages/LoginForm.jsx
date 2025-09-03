import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { setUserCookies } from "../utils/cookieUtils";
import "./Loginform.css";

const MAX_ATTEMPTS = 3; // Maximum login attempts
const LOCKOUT_TIME = 30000; // Lockout time in milliseconds

const LoginForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    userName: "",
    password: ""
  });

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(null);

  // Role-based redirect paths
  const roleRedirectPaths = {
    Patient: "/Home",
    Doctor: "/doctor",
    Manager: "/Manager",
    Nurse: "/nurse",
    Cleaner: "/cleaner",
    Receptionist: "/reception",
    Admin:"/Admin"
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Start lockout timer
  const startLockoutTimer = () => {
    setIsLockedOut(true);
    setLockoutTimer(LOCKOUT_TIME / 1000); // Convert to seconds
    const interval = setInterval(() => {
      setLockoutTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setLoginAttempts(0);
          setIsLockedOut(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (isLockedOut) {
      setError("Too many failed attempts. Please wait.");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:3030/user/login-user",
        formData
      );

      if (response.status === 200) {
        const { user } = response.data;
        // Store all relevant user data in cookies
        setUserCookies(response.data);

        setSuccessMessage("Login successful! Redirecting...");
        setLoginAttempts(0);

        // Get redirect path based on the user's role from the response
        const redirectPath = roleRedirectPaths[user.role] || "/login";

        // Redirect without user ID in the URL
        navigate(redirectPath);
      }
    } catch (err) {
      setError("Login failed. Please check your credentials.", err);
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setError("Too many failed attempts. Locking out...");
        startLockoutTimer();
      }
    }
  };

  // Redirect to register page
  const handleRegisterRedirect = () => {
    navigate("/register");
  };

  return (
    <div className="login-form">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        {/* Username */}
        <div className="form-group">
          <label htmlFor="userName">Username</label>
          <input
            id="userName"
            type="text"
            name="userName"
            value={formData.userName}
            onChange={handleChange}
            required
            disabled={isLockedOut}
          />
        </div>

        {/* Password */}
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={isLockedOut}
          />
        </div>

        {/* Submit Button */}
        <button type="submit" disabled={isLockedOut}>
          {isLockedOut ? `Locked (${lockoutTimer}s)` : "Login"}
        </button>

        {/* Register Button */}
        <span className="account-message">Don&apos;t have an account?</span>
        <button
          type="button"
          className="register-button"
          onClick={handleRegisterRedirect}
        >
          Register
        </button>

        {/* Error Message */}
        {error && <p className="error-message">{error}</p>}

        {/* Success Message */}
        {successMessage && <p className="success-message">{successMessage}</p>}
      </form>
    </div>
  );
};

export default LoginForm;
