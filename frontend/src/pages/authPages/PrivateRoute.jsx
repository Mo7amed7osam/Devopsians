import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import axios from "axios";
import { getUserData } from "../utils/cookieUtils";
import { API_BASE as API_URL } from "../utils/api";

const PrivateRoute = ({ children, requiredRole }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = getUserData();
    
    if (!userData || !userData.token) {
      navigate("/login");
      return;
    }

    // If we already have the role in cookies, check it immediately
    if (userData.role && requiredRole && userData.role !== requiredRole) {
      navigate("/unauthorized");
      return;
    }

    // Verify token by sending it in the body
    axios
      .post(`${API_URL}/user/verify-token`, { token: userData.token })
      .then((response) => {
        if (response.status === 200) {
          setIsAuthenticated(true);
          // Check if the role matches the required role
          if (requiredRole && response.data.role !== requiredRole) {
            navigate("/unauthorized"); // Redirect to Unauthorized page
          }
        }
      })
      .catch((error) => {
        console.error(
          "Error verifying token:",
          error.response?.data || error.message
        );
        setIsAuthenticated(false);
        navigate("/login");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [navigate, requiredRole]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Render the protected content if authenticated
  return isAuthenticated ? children : null;
};
PrivateRoute.propTypes = {
  children: PropTypes.node,
  requiredRole: PropTypes.string
};

export default PrivateRoute;
