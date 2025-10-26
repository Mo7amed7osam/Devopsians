// src/utils/auth.js
import { getToken, getRole } from './cookieUtils';

/**
 * Checks if a user is currently logged in.
 * @returns {boolean} True if a valid token is present.
 */
export const isAuthenticated = () => {
    return !!getToken();
};

/**
 * Retrieves the current user's role.
 * @returns {string | null} The user's role string, or null if not logged in.
 */
export const getUserRole = () => {
    return getRole();
};

/**
 * Checks if the current user has the required role for a route.
 * @param {string[]} allowedRoles - Array of roles allowed (e.g., ['admin', 'manager']).
 * @returns {boolean} True if the user is authenticated and their role is allowed.
 */
export const isAuthorized = (allowedRoles) => {
    const role = getRole();
    if (!role) return false;
    return allowedRoles.includes(role);
};