// src/utils/api.js
import axios from 'axios';
import { getToken, clearSession } from './cookieUtils';

// ============================================================
//    BACKEND SETUP
// ============================================================
// Backend server runs on port 3030
// ============================================================

const API = axios.create({
  baseURL: 'http://localhost:3030', // ⬅️ Backend URL
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// ============================================================
//   Request Interceptor — attach JWT Token (if any saved)
// ============================================================
API.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
//    Response Interceptor — handle global errors
// ============================================================
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    if (status === 401) {
      console.warn('Unauthorized - clearing session');
      clearSession();
    } else if (status === 403) {
      console.warn('Forbidden access');
    }
    return Promise.reject(error);
  }
);

// ============================================================
//    MOCK AUTHENTICATION FUNCTIONS (for json-server)
// ============================================================

/**
 * Simulates a login by finding a matching user in mockData.json
 * @param {Object} credentials - { emailOrUsername, password }
 */
export const loginUser = async ({ emailOrUsername, password }) => {
  // Check if input looks like an email (contains @)
  const isEmail = emailOrUsername?.includes('@');
  
  const payload = {
    password,
    ...(isEmail ? { email: emailOrUsername } : { userName: emailOrUsername })
  };
  
  const res = await API.post('/user/login-user', payload);
  return res;
};

/**
 * Simulates patient registration by adding user to mockData.json
 * @param {Object} userData - { name, email, password }
 */
export const registerPatient = async (userData) => {
  // Map simple form to backend expected shape
  const { name = '', email, password, gender = 'Male', phone = '', medicalHistory, currentCondition } = userData;
  const [firstName = 'Patient', ...rest] = name.trim().split(' ').filter(Boolean);
  const lastName = rest.length ? rest.join(' ') : 'User';
  const userName = email?.split('@')[0];

  const payload = {
    userName,
    firstName,
    lastName,
    userPass: password,
    // Backend schema allows only "Male" or "Female"; fall back to Male
    gender: gender === 'Female' ? 'Female' : 'Male',
    phone: phone && phone.trim().length ? phone.trim() : '0000000000',
    role: 'Patient',
    email,
    medicalHistory,
    currentCondition,
  };

  const res = await API.post('/user/create-user', payload);
  return res;
};

// ============================================================
//    MOCK PATIENT & ICU OPERATIONS (placeholders for now)
// ============================================================
export const fetchAvailableICUs = async () => {
  console.log('Mock fetchAvailableICUs called');
  return { data: [{ id: 1, name: 'ICU A', available: true }] };
};

export const reserveICU = async (icuId, patientId) => {
  console.log(`Mock reserveICU called with ICU ${icuId} for patient ${patientId}`);
  return { data: { success: true, icuId, patientId } };
};

/**
 * Fetches all ICU reservations (for receptionist to see pending check-ins)
 */
export const fetchActiveReservations = async () => {
  // Get all ICUs and filter for reserved ones
  try {
    const res = await API.get('/icu/all');
    return res;
  } catch (err) {
    // If all fails due to permissions, try available endpoint
    const res = await API.get('/icu/available');
    return res;
  }
};

/**
 * Fetches all active ambulances.
 */
export const fetchActiveAmbulances = async () => {
  const res = await API.get('/ambulance');
  return res;
};

// ---- Meta APIs: categories and specializations ----
export const getICUSpecializations = async () => {
  const res = await API.get('/meta/icu-specializations');
  return res?.data?.specializations || [];
};

export const getServiceCategories = async () => {
  const res = await API.get('/meta/service-categories');
  return res?.data?.categories || [];
};


// ============================================================
//    MOCK HOSPITAL MANAGEMENT (ADMIN/MANAGER) PLACEHOLDERS
// ============================================================
// ============================================================
// Hospital APIs
// ============================================================
export const addHospital = async (data) => {
  // Try admin route first, then hospital route
  try {
    return await API.post('/admin/add-hospital', data);
  } catch (err) {
    return await API.post('/hospital/add-hospital', data);
  }
};

export const viewAllHospitals = async () => {
  // There are both /admin/view-hospitals and /hospital/view-hospitals in the backend.
  // Prefer the admin endpoint but fall back to hospital route if needed.
  try {
    return await API.get('/admin/view-hospitals');
  } catch (err) {
    return await API.get('/hospital/view-hospitals');
  }
};

// Public endpoint to fetch nearby hospitals (no authentication required)
export const fetchNearbyHospitalsPublic = async (latitude, longitude, maxDistance = 50000) => {
  // Use axios directly without the interceptor to avoid sending auth token
  const response = await axios.get('http://localhost:3030/hospital/nearby', {
    params: { latitude, longitude, maxDistance }
  });
  return response;
};

export const blockHospitalById = async (hospitalId) => {
  return await API.put(`/admin/block-hospital/${hospitalId}`);
};

export const unblockHospitalById = async (hospitalId) => {
  return await API.put(`/admin/unblock-hospital/${hospitalId}`);
};

export const deleteHospitalById = async (hospitalId) => {
  return await API.delete(`/admin/delete-hospital/${hospitalId}`);
};

export const assignManagerToHospital = async (payload) => {
  // payload could be { managerId, hospitalId }
  return await API.post('/admin/assign-manager', payload);
};
export const assignManagerToHospitalById = async (hospitalId, payload) => await API.put(`/hospital/assign-manager/${hospitalId}`, payload);

export const createManagerAccount = async (managerData) => {
  return await API.post('/admin/create-manager-account', managerData);
};

export const createAdminAccount = async (adminData) => {
  return await API.post('/admin/create-admin-account', adminData);
};

export const viewAllAdmins = async () => await API.get('/admin/view-all-admins');
export const viewAllManagers = async () => await API.get('/admin/view-all-managers');
export const searchManagerWithHospitals = async (queryParams) => await API.get('/admin/search-manager-with-hospitals', { params: queryParams });
export const searchHospitalWithFeedbacks = async (hospitalId) => await API.get(`/admin/search-hospital-with-feedbacks/${hospitalId}`);
export const viewAnManager = async (managerId) => await API.get(`/admin/view-an-managers/${managerId}`);
export const viewHospitalsRating = async () => await API.get('/admin/view-hospitals-rating');

// --- Manager endpoints ---
export const getManagerHospital = async () => await API.get('/manager/my-hospital');

// --- User management endpoints (admin) ---
export const deleteUserById = async (userId) => await API.delete(`/admin/delete-user/${userId}`);
export const blockUserById = async (userId) => await API.put(`/admin/block-user/${userId}`);
export const unblockUserById = async (userId) => await API.put(`/admin/unblock-user/${userId}`);
export const updateUserById = async (userId, payload) => await API.put(`/admin/update-user/${userId}`, payload);

/**
 * Fetches system-wide statistics (e.g., total ICUs, occupied count).
 */
export const fetchSystemStats = async () => {
  // Call backend ICU endpoint to compute system-wide stats
  try {
    const res = await API.get('/icu/all');
    const icus = res?.data?.data || res?.data || [];
    const icuArray = Array.isArray(icus) ? icus : [];
    const total = icuArray.length;
    const occupied = icuArray.filter(i => (i.status || '').toString().toLowerCase() === 'occupied').length;
    const available = icuArray.filter(i => (i.status || '').toString().toLowerCase() === 'available').length;
    return { data: { totalIcus: total, occupiedIcus: occupied, availableIcus: available } };
  } catch (err) {
    // Fallback: return zeros if backend is unavailable or unauthorized
    return { data: { totalIcus: 0, occupiedIcus: 0, availableIcus: 0 } };
  }
};
export const fetchSystemLogs = async () => {
  console.log('Mock fetchSystemLogs called');
  // In real app, add query params for pagination/filtering
  const res = await API.get(`/systemLogs?_sort=timestamp&_order=desc`); // Sort newest first
  return res;
};
// ============================================================
// 🔧 TEMP MOCK PLACEHOLDERS for UI testing (not implemented yet)
// ============================================================

export const createAndAssignManager = async (managerData) => {
  console.log('Mock createAndAssignManager called', managerData);
  return { data: { success: true } };
};

export const scheduleMedicines = async (patientId, schedule) => {
  console.log('Mock scheduleMedicines called', patientId, schedule);
  return { data: { success: true } };
};

export const updateTaskStatus = async (taskId, newStatus) => {
  console.log('Mock updateTaskStatus called', taskId, newStatus);
  return { data: { success: true } };
};

export const viewHospitalICUs = async (hospitalId) => {
  console.log('Mock viewHospitalICUs called', hospitalId);
  // Let's make this return data based on our mockData.json
  const allIcus = [
      { id: 'icu01', hospitalId: 'HOSP_XYZ', room: '101', specialization: 'Cardiology', status: 'AVAILABLE', capacity: 1, fee: 600, patientId: null },
      { id: 'icu02', hospitalId: 'HOSP_XYZ', room: '102', specialization: 'Neurology', status: 'OCCUPIED', capacity: 1, fee: 800, patientId: 'p_abc' },
      { id: 'icu03', hospitalId: 'HOSP_XYZ', room: '103', specialization: 'General', status: 'MAINTENANCE', capacity: 2, fee: 500, patientId: null },
      { id: 'icu04', hospitalId: 'HOSP_XYZ', room: '201', specialization: 'Pediatrics', status: 'AVAILABLE', capacity: 1, fee: 750, patientId: null }
  ];
  return { data: allIcus.filter(icu => icu.hospitalId === hospitalId) };
};

export const deleteICU = async (icuId) => {
  console.log('Mock deleteICU called', icuId);
  return { data: { deleted: true } };
};


export const reserveVisitorsRoom = async (details) => {
  console.log('Mock reserveVisitorsRoom called', details);
  return { data: { success: true } };
};
export const registerICU = async (icuData) => {
  console.log('Mock registerICU called', icuData);
  return { data: { success: true } };
};

// ============================================================
// Ambulance APIs
// ============================================================
export const getAllAmbulances = async () => await API.get('/ambulance');
export const getAmbulanceById = async (ambulanceId) => await API.get(`/ambulance/${ambulanceId}`);
export const updateAmbulanceStatus = async (ambulanceId, statusPayload) => await API.put(`/ambulance/${ambulanceId}/status`, statusPayload);
export const assignAmbulance = async (ambulanceId, payload) => await API.post(`/ambulance/${ambulanceId}/assign`, payload);

// ============================================================
// ICU APIs
// ============================================================
export const getAllICUs = async () => await API.get('/icu/all');
export const getAvailableICUsFromServer = async () => await API.get('/icu/available');
export const getICUById = async (icuId) => await API.get(`/icu/${icuId}`);
export const reserveICUOnServer = async (payload) => await API.post('/icu/reserve', payload);
export const cancelICUReservation = async (payload) => await API.post('/icu/cancel', payload);

// Doctor APIs removed — doctor role/pages have been removed from the frontend.

// ============================================================
// Manager APIs
// ============================================================
export const assignBackupManager = async (payload) => await API.post('/manager/assign-backup-manager', payload);
export const registerICUOnServer = async (icuData) => await API.post('/manager/register-icu', icuData);
export const deleteICUById = async (icuId) => await API.delete(`/manager/delete-icu/${icuId}`);
export const updateICUById = async (icuId, updatePayload) => await API.put(`/manager/update-icu/${icuId}`, updatePayload);
export const viewICUsForManager = async () => await API.get('/manager/view-icus');
export const addEmployee = async (employeeData) => await API.post('/manager/add-employee', employeeData);
export const removeEmployee = async (userId) => await API.delete(`/manager/remove-employee/${userId}`);
export const trackEmployeeTasks = async (params) => await API.get('/manager/track-employee-tasks', { params });
export const createAndAssignTask = async (taskData) => await API.post('/manager/create-and-assign-task', taskData);
export const registerVisitorRoomManager = async (roomData) => await API.post('/manager/register-visitor-room', roomData);
export const calculateFeesForUser = async (userId) => await API.get(`/manager/calculate-fees/${userId}`);
export const viewICUByIdManager = async (icuId) => await API.get(`/manager/view-icu-byid/${icuId}`);
export const viewAllEmployeesForManager = async (managerId) => await API.get(`/manager/view-all-employees/${managerId}`);

// ============================================================
// Patient APIs
// ============================================================
export const updateMedicalHistoryForPatient = async (historyPayload) => await API.put('/patient/medical-history', historyPayload);
export const rateHospitalByPatient = async (ratingPayload) => await API.post('/patient/rate-hospital', ratingPayload);
export const getMedicineScheduleForUser = async (userId) => await API.get(`/patient/medicine-schedule/${userId}`);
export const getTotalFeesForUser = async (userId) => await API.get(`/patient/total-fees/${userId}`);
export const reserveICUForPatient = async (payload) => await API.post('/patient/reserve-icu', payload);
export const freeICUForPatient = async (payload) => await API.post('/patient/free-icu', payload);
export const getAvailableICUsPatient = async () => await API.get('/patient/get-available-icus');
export const reserveVisitorRoomPatient = async (payload) => await API.post('/patient/reserve-visitor-room', payload);
export const reserveKidsAreaPatient = async (payload) => await API.post('/patient/reserve-kids-area', payload);
export const getUserReservedServices = async (userId) => await API.get(`/patient/reserved-services/${userId}`);

// ============================================================
// Receptionist APIs
// ============================================================
export const getICURequests = async () => await API.get('/receptionist/icu-requests');
export const getCheckedInPatients = async () => await API.get('/receptionist/checked-in-patients');
export const reserveICUReceptionist = async (payload) => await API.post('/receptionist/reserve-icu', payload);
export const checkInPatient = async (payload) => await API.post('/receptionist/check-in', payload);
export const checkOutPatient = async (payload) => await API.post('/receptionist/check-out', payload);
export const calculateFeeReceptionist = async (params) => await API.get('/receptionist/calculate-fee', { params });
export const markFeesPaid = async (payload) => await API.post('/receptionist/mark-fees-paid', payload);

// ============================================================
// User / Auth helpers
// ============================================================
export const verifyToken = async (tokenPayload) => await API.post('/user/verify-token', tokenPayload);
export const updateUserMedicalDetails = async (userId, payload) => await API.put(`/user/${userId}/update-medical-details`, payload);
export const showUserDetails = async (userId) => await API.get(`/user/details/${userId}`);
export const sendEmail = async (payload) => await API.post('/user/send-email', payload);

// Backwards-compatible aliases (older UI code expects these names)
export const blockHospital = async (hospitalId) => await blockHospitalById(hospitalId);
export const unblockHospital = async (hospitalId) => await unblockHospitalById(hospitalId);
export const updateMedicalHistory = async (patientIdOrPayload, maybeHistory) => {
  // Keep the old signature used in some pages: updateMedicalHistory(patientId, history)
  if (typeof patientIdOrPayload === 'string' && maybeHistory) {
    return await updateMedicalHistoryForPatient({ userId: patientIdOrPayload, history: maybeHistory });
  }
  // Otherwise assume it's the new payload object
  return await updateMedicalHistoryForPatient(patientIdOrPayload);
};

// ============================================================
// Ambulance Request APIs
// ============================================================

/**
 * Patient creates ambulance request
 * @param {Object} payload - { pickupLocation, pickupCoordinates, urgency, notes }
 */
export const createAmbulanceRequest = async (payload) => await API.post('/ambulance/request', payload);

/**
 * Ambulance crew fetches active requests sorted by distance
 * @param {Object} location - { latitude, longitude } - ambulance's current location
 */
export const getActiveAmbulanceRequests = async (location) => {
  // Backend expects JSON string with GeoJSON-like coordinates: { coordinates: [lng, lat] }
  const params = location && typeof location.latitude === 'number' && typeof location.longitude === 'number'
    ? { location: JSON.stringify({ coordinates: [location.longitude, location.latitude] }) }
    : {};
  return await API.get('/ambulance/requests', { params });
};

/**
 * Ambulance accepts a request (locks it to them)
 * @param {String} requestId - ID of the ambulance request
 */
export const acceptAmbulanceRequest = async (requestId) => await API.post(`/ambulance/requests/${requestId}/accept`);

/**
 * Patient cancels their ambulance request
 * @param {String} requestId - ID of the ambulance request
 */
export const cancelAmbulanceRequest = async (requestId) => await API.delete(`/ambulance/requests/${requestId}/cancel`);

/**
 * Patient fetches their active ambulance request
 */
export const getMyAmbulanceRequest = async () => await API.get('/ambulance/my-request');

/**
 * Ambulance fetches their accepted request
 */
export const getMyAcceptedRequest = async () => await API.get('/ambulance/my-accepted-request');


// ============================================================
//    EXPORTS
// ============================================================

export const API_BASE = 'http://localhost:3030'; // Export base URL for other modules
export default API;