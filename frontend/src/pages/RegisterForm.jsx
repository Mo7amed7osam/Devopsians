import { useState } from "react";
import axios from "axios";
import "./RegisterForm.css";

function RegistrationForm() {
  const [formData, setFormData] = useState({
    userName: "",
    firstName: "",
    lastName: "",
    gender: "",
    phone: "",
    email: "",
    userPass: "",
    role: "Patient",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    let formErrors = {};
    // Validate username
    if (!formData.userName) formErrors.userName = "Username is required.";
    // Validate first name
    if (!formData.firstName) formErrors.firstName = "First name is required.";
    // Validate last name
    if (!formData.lastName) formErrors.lastName = "Last name is required.";
    // Validate email
    if (!formData.email) formErrors.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      formErrors.email = "Invalid email address.";
    // Validate phone
    if (!formData.phone) formErrors.phone = "Phone number is required.";
    else if (!/^\d{11}$/.test(formData.phone))
      formErrors.phone = "Phone number must be exactly 11 digits.";
    // Validate password
    if (!formData.userPass) formErrors.userPass = "Password is required.";
    else if (formData.userPass.length < 6)
      formErrors.userPass = "Password must be at least 6 characters.";

    return formErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const formErrors = validateForm();
    setErrors(formErrors);
  
    if (Object.keys(formErrors).length > 0) return;
  
    try {
      const response = await axios.post(
        "http://localhost:3030/user/create-user",
        formData
      );
      console.log("Response:", response.data);
      alert("Registration successful!");
  
      await axios.post("http://localhost:3030/user/send-email", {
        email: formData.email,
        name: formData.firstName,
      });
      alert("Welcome email sent!");
    } catch (err) {
      console.error("Error:", err.response?.data || err.message);
      alert("An error occurred. Please try again!");
    }
  };
  
  
  const handleLoginRedirect = () => {
    window.location.href = "/login";
  };

  return (
    <div className="registration-form">
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        {/* Username */}
        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            name="userName"
            value={formData.userName}
            onChange={handleChange}
            required
          />
          {errors.userName && (
            <p className="error-message">{errors.userName}</p>
          )}
        </div>

        {/* First and Last Name */}
        <div className="row">
          <div className="form-group">
            <input
              type="text"
              placeholder="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
            {errors.firstName && (
              <p className="error-message">{errors.firstName}</p>
            )}
          </div>
          <div className="form-group">
            <input
              type="text"
              placeholder="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
            {errors.lastName && (
              <p className="error-message">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          {errors.email && <p className="error-message">{errors.email}</p>}
        </div>

        {/* Gender */}
        <label htmlFor="gender" style={{ color: "black" }}>
          Gender
        </label>
        <div className="radio-group">
          <div className="radio-option male">
            <input
              type="radio"
              id="male"
              name="gender"
              value="Male"
              onChange={handleChange}
              checked={formData.gender === "Male"}
            />
            <label htmlFor="male">Male</label>
          </div>
          <div className="radio-option female">
            <input
              type="radio"
              id="female"
              name="gender"
              value="Female"
              onChange={handleChange}
              checked={formData.gender === "Female"}
            />
            <label htmlFor="female">Female</label>
          </div>
        </div>
        {errors.gender && <p className="error-message">{errors.gender}</p>}

        {/* Phone */}
        <div className="form-group">
          <label>Phone Number</label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            maxLength="11"
            pattern="\d{11}"
          />
          {errors.phone && <p className="error-message">{errors.phone}</p>}
        </div>

        {/* Password */}
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            name="userPass"
            value={formData.userPass}
            onChange={handleChange}
            required
            minLength="6"
          />
          {errors.userPass && (
            <p className="error-message">{errors.userPass}</p>
          )}
        </div>
        {errors.fieldName && (
          <p className="error-message">{errors.fieldName}</p>
        )}

        {/* Submit Button */}
        <button type="submit">Register</button>
        <div className="login-redirect">
          <span>Already have an account?</span>
          <button
            type="button"
            onClick={handleLoginRedirect}
            className="login-button"
          >
            Login
          </button>
        </div>
      </form>
    </div>
  );
}

export default RegistrationForm;
