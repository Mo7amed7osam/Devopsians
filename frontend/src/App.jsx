// src/App.jsx
import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- Global Components ---
import Navigation from './components/common/Navigation.jsx';
// import Footer from './components/Footer.jsx';

// --- Utilities & Security ---
import PrivateRoute from './routes/PrivateRoute.jsx';
import socket from './utils/socket';
import { useAuth } from './contexts/AuthContext'; 

// --- Import Auth Pages ---
import LandingPage from './pages/auth/LandingPage.jsx';
import LoginForm from './pages/auth/LoginForm.jsx';
import RegisterForm from './pages/auth/RegisterForm.jsx';
import PageNotFound from './pages/auth/PageNotFound.jsx';

// --- Import Patient Pages ---
import ICUSelect from './pages/Patient/ICUSelect.jsx';
import PatientHomePage from './pages/Patient/PatientHomePage.jsx';

// --- Import Manager Pages ---
import ManagerDashboard from './pages/Manager/ManagerDashboard.jsx';

// --- Import Admin Pages ---
import AdminDashboard from './pages/Admin/AdminDashboard.jsx';

// --- Import Shared Pages ---
import ReceptionistPanel from './pages/Receptionist/ReceptionistPanel.jsx';
import AmbulancePanel from './pages/Ambulance/AmbulancePanel.jsx';


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
                                <AdminDashboard />
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

                    {/* --- Doctor route removed from project --- */}

                    {/* --- EMPLOYEE ROLE ROUTES (NOW SEPARATED) --- */}
                    <Route
                        path="/receptionist"
                        element={
                            <PrivateRoute allowedRoles={['receptionist']}>
                                <ReceptionistPanel />
                            </PrivateRoute>
                        }
                    />
                    {/* Nurse and Cleaner routes removed - components not implemented */}
                    {/* NEW ROUTE for Ambulance */}
                    <Route
                        path="/ambulance"
                        element={
                            <PrivateRoute allowedRoles={['ambulance']}>
                                <AmbulancePanel />
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