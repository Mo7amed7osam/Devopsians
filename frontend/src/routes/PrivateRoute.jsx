import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { getUserData } from "../utils/cookieUtils";
import { safeNavigate } from "../utils/security";
import API from "../utils/api";

const PrivateRoute = ({ children, requiredRole }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = getUserData();
    
    if (!userData || !userData.token) {
      safeNavigate(navigate, "/login");
      return;
    }

    // ALWAYS verify token and role with backend - never trust client-side data
    API
      .post('/user/verify-token', { token: userData.token })
      .then((response) => {
        if (response.status === 200) {
          const backendRole = response.data.role;
          
          // Check if backend role matches required role
          if (requiredRole && backendRole !== requiredRole) {
            console.warn(`Access denied: User has role "${backendRole}" but "${requiredRole}" is required`);
            safeNavigate(navigate, "/unauthorized");
            return;
          }
          
          setIsAuthenticated(true);
        }
      })
      .catch((error) => {
        console.error(
          "Error verifying token:",
          error.response?.data || error.message
        );
        setIsAuthenticated(false);
        safeNavigate(navigate, "/login");
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
