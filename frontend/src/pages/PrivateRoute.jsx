import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const PrivateRoute = ({ children, requiredRole }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      navigate("/login");
      return;
    }

    // Verify token by sending it in the body
    axios
      .post("http://localhost:3030/user/verify-token", { token })
      .then((response) => {
        if (response.status === 200) {
          setIsAuthenticated(true);
          setUserRole(response.data.role);
          console.log("This is Requrired Role", { requiredRole });
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
        navigate("/login");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [navigate, requiredRole]);

  // Show loading state while checking authentication
  if (loading) {
    return <div>Loading...</div>;
  }

  // Render the protected content if authenticated
  return isAuthenticated ? children : null;
};

export default PrivateRoute;
