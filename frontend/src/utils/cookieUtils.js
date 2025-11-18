// src/utils/cookieUtils.js
import Cookies from 'js-cookie';

const TOKEN_KEY = 'auth_token';
const ROLE_KEY = 'user_role';
const USER_NAME_KEY = 'user_name';
const USER_ID_KEY = 'user_id';
const HOSPITAL_NAME_KEY = 'hospital_name';

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
//    USER NAME MANAGEMENT — stored in localStorage
// ============================================================

/**
 * Stores the user's name.
 * @param {string} firstName
 * @param {string} lastName
 */
export const setUserName = (firstName, lastName) => {
  const fullName = `${firstName} ${lastName}`.trim();
  localStorage.setItem(USER_NAME_KEY, fullName);
};

/**
 * Retrieves the user's stored name.
 */
export const getUserName = () => localStorage.getItem(USER_NAME_KEY);

/**
 * Removes the stored user name.
 */
export const removeUserName = () => {
  localStorage.removeItem(USER_NAME_KEY);
};

// ============================================================
//    HOSPITAL NAME MANAGEMENT — stored in localStorage
// ============================================================

/**
 * Stores the hospital name.
 * @param {string} hospitalName
 */
export const setHospitalName = (hospitalName) => {
  if (hospitalName) {
    localStorage.setItem(HOSPITAL_NAME_KEY, hospitalName);
  }
};

/**
 * Retrieves the stored hospital name.
 */
export const getHospitalName = () => localStorage.getItem(HOSPITAL_NAME_KEY);

/**
 * Removes the stored hospital name.
 */
export const removeHospitalName = () => {
  localStorage.removeItem(HOSPITAL_NAME_KEY);
};

// ============================================================
//    USER ID MANAGEMENT — stored in localStorage
// ============================================================

/**
 * Stores the user's ID.
 * @param {string} id
 */
export const setUserId = (id) => {
  localStorage.setItem(USER_ID_KEY, id);
};

/**
 * Retrieves the user's stored ID.
 */
export const getUserId = () => {
  const stored = localStorage.getItem(USER_ID_KEY);
  if (stored) return stored;
  // Fallback: try to decode JWT to obtain user id
  try {
    const token = getToken();
    if (!token) return null;
    const [, payload] = token.split('.');
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload));
    return decoded?.id || decoded?.userId || null;
  } catch {
    return null;
  }
};

/**
 * Removes the stored user ID.
 */
export const removeUserId = () => {
  localStorage.removeItem(USER_ID_KEY);
};

// ============================================================
//    SESSION HELPERS
// ============================================================

/**
 * Saves both token and role in one go (used after login).
 */
export const saveSession = (token, role, user = null) => {
  setToken(token);
  setRole(role);
  if (user) {
    if (user.firstName && user.lastName) {
      setUserName(user.firstName, user.lastName);
    }
    const uid = user.id || user._id; // support both shapes
    if (uid) setUserId(uid);
    
    // Store hospital name if available (for receptionists, managers, etc.)
    if (user.assignedHospital?.name) {
      setHospitalName(user.assignedHospital.name);
    } else if (user.hospitalName) {
      setHospitalName(user.hospitalName);
    }
  }
};

/**
 * Clears all session data (used on logout).
 */
export const clearSession = () => {
  removeToken();
  removeRole();
  removeUserName();
  removeUserId();
  removeHospitalName();
};

/**
 * Gets both token and role for authentication checks.
 */
export const getUserData = () => {
  const token = getToken();
  const role = getRole();
  const name = getUserName();
  const id = getUserId();
  const hospitalName = getHospitalName();
  return token ? { token, role, name, id, hospitalName } : null;
};
