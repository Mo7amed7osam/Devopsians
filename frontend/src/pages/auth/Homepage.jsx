// src/pages/Homepage.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRole } from '../utils/cookieUtils';
import styles from './Homepage.module.css';

const Homepage = () => {
    const navigate = useNavigate();
    const role = getRole(); // Get user's role

    useEffect(() => {
        // If a user is logged in, immediately redirect them to their main dashboard
        if (role) {
            let path = '/';
            switch (role) {
                case 'admin': path = '/admin'; break;
                case 'manager': path = '/manager'; break;
                case 'patient': path = '/patient-dashboard'; break;
                case 'doctor': path = '/doctor'; break;
                case 'nurse': path = '/nurse'; break;
                case 'receptionist': path = '/receptionist'; break;
                case 'cleaner': path = '/cleaner'; break;
                default: path = '/'; 
            }
            navigate(path, { replace: true });
        }
    }, [role, navigate]);

    // If the user lands here without a role (which shouldn't happen if App.jsx handles routing), show a default message.
    if (!role) {
        return (
            <div className={styles.loadingContainer}>
                <h1>Redirecting...</h1>
                <p>Please log in to access your dashboard.</p>
                <button onClick={() => navigate('/login')} className={styles.loginButton}>Go to Login</button>
            </div>
        );
    }
    
    return (
        <div className={styles.loadingContainer}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '3em', color: '#007bff' }}></i>
            <h1 className={styles.title}>Loading {role.toUpperCase()} Dashboard...</h1>
        </div>
    );
};

export default Homepage;