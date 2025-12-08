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
  const isSecureContext = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  Cookies.set(TOKEN_KEY, token, {
    expires: 7, // valid for 7 days
    // Use secure cookies only when actually on HTTPS to avoid browsers dropping the cookie in staging/http
    secure: isSecureContext,
    sameSite: 'Strict', // prevent CSRF
    path: '/', // accessible across all routes
  });
};

/**
 * Retrieves the stored authentication token.
 */
export const getToken = () => Cookies.get(TOKEN_KEY);

/**
 * Removes the authentication token.
 */
export const removeToken = () => Cookies.remove(TOKEN_KEY, { path: '/' });

// ============================================================
//    ROLE MANAGEMENT — stored in secure HTTP-only cookies
// ============================================================

/**
 * Stores the user's role (e.g., 'admin', 'doctor', etc.).
 * @param {string} role
 */
export const setRole = (role) => {
  const isSecureContext = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  Cookies.set(ROLE_KEY, role, {
    expires: 7,
    secure: isSecureContext,
    sameSite: 'Strict',
    path: '/',
  });
};

/**
 * Retrieves the user's stored role.
 */
export const getRole = () => Cookies.get(ROLE_KEY);

/**
 * Removes the stored user role.
 */
export const removeRole = () => {
  Cookies.remove(ROLE_KEY, { path: '/' });
};

// ============================================================
//    USER NAME MANAGEMENT — stored in secure cookies
// ============================================================

/**
 * Stores the user's name.
 * @param {string} firstName
 * @param {string} lastName
 */
export const setUserName = (firstName, lastName) => {
  const isSecureContext = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  const fullName = `${firstName} ${lastName}`.trim();
  Cookies.set(USER_NAME_KEY, fullName, {
    expires: 7,
    secure: isSecureContext,
    sameSite: 'Strict',
    path: '/',
  });
};

/**
 * Retrieves the user's stored name.
 */
export const getUserName = () => Cookies.get(USER_NAME_KEY);

/**
 * Removes the stored user name.
 */
export const removeUserName = () => {
  Cookies.remove(USER_NAME_KEY, { path: '/' });
};

// ============================================================
//    HOSPITAL NAME MANAGEMENT — stored in secure cookies
// ============================================================

/**
 * Stores the hospital name.
 * @param {string} hospitalName
 */
export const setHospitalName = (hospitalName) => {
  const isSecureContext = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  if (hospitalName) {
    Cookies.set(HOSPITAL_NAME_KEY, hospitalName, {
      expires: 7,
      secure: isSecureContext,
      sameSite: 'Strict',
      path: '/',
    });
  }
};

/**
 * Retrieves the stored hospital name.
 */
export const getHospitalName = () => Cookies.get(HOSPITAL_NAME_KEY);

/**
 * Removes the stored hospital name.
 */
export const removeHospitalName = () => {
  Cookies.remove(HOSPITAL_NAME_KEY, { path: '/' });
};

// ============================================================
//    USER ID MANAGEMENT — stored in secure cookies
// ============================================================

/**
 * Stores the user's ID.
 * @param {string} id
 */
export const setUserId = (id) => {
  const isSecureContext = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  Cookies.set(USER_ID_KEY, id, {
    expires: 7,
    secure: isSecureContext,
    sameSite: 'Strict',
    path: '/',
  });
};

/**
 * Retrieves the user's stored ID.
 */
export const getUserId = () => {
  const stored = Cookies.get(USER_ID_KEY);
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
  Cookies.remove(USER_ID_KEY, { path: '/' });
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
