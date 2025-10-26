// src/pages/PrivateRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // 1. Import the useAuth hook

const PrivateRoute = ({ children, allowedRoles = [] }) => {
    // 2. Get all auth info from our single source of truth
    const { isAuthenticated, userRole } = useAuth();

    // 1. Not Authenticated: Redirect to Login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // 2. Authenticated but not Authorized for this specific route
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        console.warn(`Access denied. User role '${userRole}' is not allowed here.`);
        // Redirect them to their default dashboard, a safe fallback.
        const safePath = userRole === 'patient' ? '/patient-dashboard' : '/';
        return <Navigate to={safePath} replace />;
    }

    // 3. If all checks pass, render the component they asked for
    return children;
};

export default PrivateRoute;