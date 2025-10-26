// src/pages/UserHomeScreen.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getRole } from '../utils/cookieUtils';
import styles from './UserHomeScreen.module.css';
import Button from '../components/Button'; // 1. Import Button

const UserHomeScreen = () => {
    const navigate = useNavigate();
    const role = getRole() || 'user'; 

    const getRolePath = (r) => {
        switch (r) {
            case 'admin': return '/admin';
            case 'manager': return '/manager';
            case 'patient': return '/patient-dashboard';
            case 'doctor': return '/doctor';
            case 'nurse': return '/nurse';
            case 'receptionist': return '/receptionist';
            case 'cleaner': return '/cleaner';
            default: return '/';
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.welcomeCard}>
                <h1 className={styles.title}>Welcome, {role.toUpperCase()}</h1>
                <p className={styles.message}>
                    Your dedicated dashboard provides all the tools and information necessary for your role.
                </p>
                {/* 2. Replace the old button with the new component */}
                <Button 
                    onClick={() => navigate(getRolePath(role))}
                    variant="success"
                    className={styles.dashboardButton} // We'll add custom styles
                >
                    Go to Your Main Dashboard
                    <i className="fas fa-arrow-right" style={{ marginLeft: '10px' }}></i>
                </Button>
            </div>
            
            {/* Quick links relevant to all users */}
            <section className={styles.quickActions}>
                <div className={styles.actionItem}>
                    <i className="fas fa-search"></i>
                    <h4>Find ICU (Public)</h4>
                    <p>Search for nearest ICUs regardless of login.</p>
                    {/* This button has a different style, we'll keep it for now */}
                    <button onClick={() => navigate('/find-icu')}>Search</button>
                </div>
                {role === 'patient' && (
                    <div className={styles.actionItem}>
                        <i className="fas fa-history"></i>
                        <h4>View Reservations</h4>
                        <p>Check status of ICU and visitor room bookings.</p>
                        <button onClick={() => navigate('/patient-dashboard')}>View</button>
                    </div>
                )}
            </section>
        </div>
    );
};
export default UserHomeScreen;