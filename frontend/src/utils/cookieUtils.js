// src/utils/cookieUtils.js
import Cookies from 'js-cookie';

const TOKEN_KEY = 'auth_token';
const ROLE_KEY = 'user_role';

// ============================================================
//   TOKEN MANAGEMENT — stored in secure cookies
// ============================================================

/**
 * Stores the authentication token securely in cookies.
 * @param {string} token - JWT or mock token.
 */
export const setToken = (token) => {
  Cookies.set(TOKEN_KEY, token, {
    expires: 7, // valid for 7 days
    secure: process.env.NODE_ENV === 'production', // only HTTPS in production
    sameSite: 'Strict', // prevent CSRF
  });
};

/**
 * Retrieves the stored authentication token.
 */
export const getToken = () => Cookies.get(TOKEN_KEY);

/**
 * Removes the authentication token.
 */
export const removeToken = () => Cookies.remove(TOKEN_KEY);

// ============================================================
//    ROLE MANAGEMENT — stored in localStorage
// ============================================================

/**
 * Stores the user's role (e.g., 'admin', 'doctor', etc.).
 * @param {string} role
 */
export const setRole = (role) => {
  localStorage.setItem(ROLE_KEY, role);
};

/**
 * Retrieves the user's stored role.
 */
export const getRole = () => localStorage.getItem(ROLE_KEY);

/**
 * Removes the stored user role.
 */
export const removeRole = () => {
  localStorage.removeItem(ROLE_KEY);
};

// ============================================================
//    SESSION HELPERS
// ============================================================

/**
 * Saves both token and role in one go (used after login).
 */
export const saveSession = (token, role) => {
  setToken(token);
  setRole(role);
};

/**
 * Clears all session data (used on logout).
 */
export const clearSession = () => {
  removeToken();
  removeRole();
};
