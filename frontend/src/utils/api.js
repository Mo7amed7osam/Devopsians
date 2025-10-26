// src/utils/api.js
import axios from 'axios';
import { getToken, clearSession } from './cookieUtils';

// ============================================================
//    MOCK BACKEND SETUP (using json-server)
// ============================================================
// Make sure your mock server runs with:
// npx json-server --watch mockData.json --port 5000
// ============================================================

const API = axios.create({
  baseURL: 'http://localhost:5000', // ⬅️ Mock backend URL
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
 * @param {Object} credentials - { email, password }
 */
export const loginUser = async ({ email, password }) => {
  const res = await API.get(`/users?email=${email}&password=${password}`);
  if (!res.data || res.data.length === 0) {
    throw new Error('Invalid email or password');
  }
  const user = res.data[0];
  // Simulate token
  return {
    data: {
      token: 'mock-jwt-token',
      role: user.role,
      user,
    },
  };
};

/**
 * Simulates patient registration by adding user to mockData.json
 * @param {Object} userData - { name, email, password }
 */
export const registerPatient = async (userData) => {
  // Check if user already exists
  const existing = await API.get(`/users?email=${userData.email}`);
  if (existing.data.length > 0) {
    throw new Error('User already exists');
  }

  const newUser = { ...userData, role: 'patient' };
  const res = await API.post('/users', newUser);
  return {
    data: {
      message: 'Patient registered successfully!',
      user: res.data,
    },
  };
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
 * Fetches all reservations with a 'PENDING_ARRIVAL' status.
 */
export const fetchActiveReservations = async () => {
  const res = await API.get(`/reservations?status=PENDING_ARRIVAL`);
  return res;
};

/**
 * Fetches all active ambulances.
 */
export const fetchActiveAmbulances = async () => {
  const res = await API.get(`/ambulances`);
  return res;
};


// ============================================================
//    MOCK HOSPITAL MANAGEMENT (ADMIN/MANAGER) PLACEHOLDERS
// ============================================================
export const addHospital = async (data) => {
  console.log('Mock addHospital', data);
  return { data: { success: true } };
};

export const viewAllHospitals = async () => {
  console.log('Mock viewAllHospitals');
  // For now, let's return the mock data directly here for testing AdminPage
  return { data: [
    { id: 'h1', name: 'Al-Salam Hospital', rating: 4.8, isBlocked: false, manager: 'Mngr 1', icuCount: 15 },
    { id: 'h2', name: 'North Star Medical', rating: 3.5, isBlocked: true, manager: 'Mngr 2', icuCount: 8 },
    { id: 'h3', name: 'General City Clinic', rating: 4.1, isBlocked: false, manager: 'Mngr 3', icuCount: 22 },
  ] };
};

/**
 * Fetches system-wide statistics (e.g., total ICUs, occupied count).
 */
export const fetchSystemStats = async () => {
  console.log('Mock fetchSystemStats called');
  // Simulate fetching all ICUs and calculating stats
  const allIcus = [ // Example data - ideally fetched from backend
      { status: 'OCCUPIED'}, { status: 'AVAILABLE' }, { status: 'MAINTENANCE' },
      { status: 'AVAILABLE'}, { status: 'OCCUPIED' }, { status: 'AVAILABLE' },
      { status: 'OCCUPIED'}, { status: 'AVAILABLE' }, { status: 'AVAILABLE' },
  ];
  const total = allIcus.length;
  const occupied = allIcus.filter(icu => icu.status === 'OCCUPIED').length;
  const available = allIcus.filter(icu => icu.status === 'AVAILABLE').length;
  return { data: { totalIcus: total, occupiedIcus: occupied, availableIcus: available } };
};
export const fetchSystemLogs = async () => {
  console.log('Mock fetchSystemLogs called');
  // In real app, add query params for pagination/filtering
  const res = await API.get(`/systemLogs?_sort=timestamp&_order=desc`); // Sort newest first
  return res;
};
// ============================================================
//    EMPLOYEE & VACATION MOCK ENDPOINTS
// ============================================================

/**
 * Employee submits a vacation request
 */
export const requestVacation = async (vacationData) => {
  const res = await API.post('/vacationRequests', vacationData);
  return res.data;
};

/**
 * Manager approves a vacation
 */
export const approveVacation = async (vacationId) => {
  const res = await API.patch(`/vacationRequests/${vacationId}`, { approved: true });
  return res.data;
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

export const updateMedicalHistory = async (patientId, history) => {
  console.log('Mock updateMedicalHistory called', patientId, history);
  return { data: { success: true } };
};

export const reserveVisitorsRoom = async (details) => {
  console.log('Mock reserveVisitorsRoom called', details);
  return { data: { success: true } };
};

export const rateDoctorAndHospital = async (data) => {
  console.log('Mock rateDoctorAndHospital called', data);
  return { data: { success: true } };
};

export const blockHospital = async (hospitalId) => {
  console.log('Mock blockHospital called', hospitalId);
  return { data: { blocked: true } };
};

export const registerICU = async (icuData) => {
  console.log('Mock registerICU called', icuData);
  return { data: { success: true } };
};


// ============================================================
//    EXPORTS
// ============================================================

export default API;