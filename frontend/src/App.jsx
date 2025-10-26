// src/App.jsx
import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- Global Components ---
import Navigation from './components/Navigation.jsx';
// import Footer from './components/Footer.jsx';

// --- Utilities & Security ---
import PrivateRoute from './pages/PrivateRoute.jsx';
import socket from './socket';
import { useAuth } from './contexts/AuthContext'; 

// --- Import All Pages ---
import LandingPage from './pages/LandingPage.jsx';
import ICUSelect from './pages/ICUSelect.jsx';
import LoginForm from './pages/LoginForm.jsx';
import RegisterForm from './pages/RegisterForm.jsx';
import PatientHomePage from './pages/PatientHomePage.jsx';
import ManagerDashboard from './pages/ManagerDashboard.jsx';
import AdminPage from './pages/AdminPage.jsx';
import DoctorPage from './pages/Doctor.jsx';
// REMOVED EmployeePage, but it's still used by ManagerDashboard
import EmployeePage from './pages/EmployeeMgmt.jsx'; 
import PageNotFound from './pages/PageNotFound.jsx';
import ReceptionistDashboard from './pages/ReceptionistDashboard.jsx';

// --- NEWLY IMPORTED DASHBOARDS ---
import NurseDashboard from './pages/Nurse.jsx';
import CleanerDashboard from './pages/Cleaner.jsx';
import AmbulanceDashboard from './pages/Ambulance.jsx';


const App = () => {
    const { isDarkMode } = useAuth();

    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }

        return () => {
            if (socket.connected) {
                socket.disconnect();
            }
        };
    }, []);

    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [isDarkMode]);

    return (
        <div id="app-container">
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
            />

            <Navigation />
            <main>
                <Routes>
                    {/* --- PUBLIC ROUTES --- */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/find-icu" element={<ICUSelect />} />
                    <Route path="/login" element={<LoginForm />} />
                    <Route path="/register" element={<RegisterForm />} />

                    {/* --- PATIENT/ENDUSER ROUTES (Role: patient) --- */}
                    <Route
                        path="/patient-dashboard"
                        element={
                            <PrivateRoute allowedRoles={['patient']}>
                                <PatientHomePage />
                            </PrivateRoute>
                        }
                    />

                    {/* --- ADMIN ROUTE (Role: admin) --- */}
                    <Route
                        path="/admin"
                        element={
                            <PrivateRoute allowedRoles={['admin']}>
                                <AdminPage />
                            </PrivateRoute>
                        }
                    />

                    {/* --- MANAGER ROUTE (Role: manager) --- */}
                    <Route
                        path="/manager"
                        element={
                            <PrivateRoute allowedRoles={['manager']}>
                                <ManagerDashboard />
                            </PrivateRoute>
                        }
                    />

                    {/* --- DOCTOR ROUTE (Role: doctor) --- */}
                    <Route
                        path="/doctor"
                        element={
                            <PrivateRoute allowedRoles={['doctor']}>
                                <DoctorPage />
                            </PrivateRoute>
                        }
                    />

                    {/* --- EMPLOYEE ROLE ROUTES (NOW SEPARATED) --- */}
                    <Route
                        path="/nurse"
                        element={
                            <PrivateRoute allowedRoles={['nurse']}>
                                {/* UPDATED to use new component */}
                                <NurseDashboard />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/receptionist"
                        element={
                            <PrivateRoute allowedRoles={['receptionist']}>
                                <ReceptionistDashboard />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/cleaner"
                        element={
                            <PrivateRoute allowedRoles={['cleaner']}>
                                {/* UPDATED to use new component */}
                                <CleanerDashboard />
                            </PrivateRoute>
                        }
                    />
                    {/* NEW ROUTE for Ambulance */}
                    <Route
                        path="/ambulance"
                        element={
                            <PrivateRoute allowedRoles={['ambulance']}>
                                <AmbulanceDashboard />
                            </PrivateRoute>
                        }
                    />

                    {/* --- CATCH-ALL ROUTE (MUST BE LAST) --- */}
                    <Route path="*" element={<PageNotFound />} />
                </Routes>
            </main>
        </div>
    );
};

export default App;