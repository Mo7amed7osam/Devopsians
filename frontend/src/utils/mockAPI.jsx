// src/utils/mockAPI.js

// This file is used to provide mock data structures to components 
// that are waiting for the backend to be completed. 
// Example structure for a hospital object:
export const mockHospital = {
    id: 'hosp101',
    name: 'City Central Hospital',
    location: { lat: 30.0444, lng: 31.2357 },
    specialization: 'Cardiology',
    availableICUs: 5,
    rating: 4.5
};

// Example structure for a task object:
export const mockTask = {
    id: 'task201',
    employeeId: 'emp55',
    description: 'Clean and sterilize ICU 3B immediately.',
    status: 'PENDING', // PENDING, IN_PROGRESS, DONE
    priority: 'High',
    deadline: new Date(Date.now() + 86400000)
};

// Components should import and use these mock objects when the real API call fails 
// or before the API call is implemented.