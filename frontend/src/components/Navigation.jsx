// src/components/Navigation.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from './Logo.jsx'; //
import styles from './Navigation.module.css'; //
import { useAuth } from '../contexts/AuthContext'; //

const Navigation = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userRole, logout, isDarkMode, toggleDarkMode } = useAuth();

  const getDashboardLink = (role) => {
    switch (role) {
      case 'admin': return '/admin';
      case 'manager': return '/manager';
      case 'doctor': return '/doctor';
      case 'nurse': return '/nurse';
      case 'receptionist': return '/receptionist';
      case 'cleaner': return '/cleaner';
      case 'patient': return '/patient-dashboard';
      default: return '/';
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className={styles.header}>
      <nav className={styles.navbar}>
        <Link to="/" className={styles.logoLink}>
          <Logo />
        </Link>
        <div className={styles.navLinks}>
          <button
              onClick={toggleDarkMode}
              className={styles.navItem} // Keep navItem class for base styling
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '8px 12px' }}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>

          <Link to="/find-icu" className={styles.navItem}>
            Find ICU
          </Link>

          {isAuthenticated && (
            <>
              <Link to={getDashboardLink(userRole)} className={styles.navItem}>
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)} Dashboard
              </Link>
              {/* Keep both classes applied */}
              <button onClick={handleLogout} className={`${styles.navItem} ${styles.logoutBtn}`}>
                Logout
              </button>
            </>
          )}

          {!isAuthenticated && (
            <>
              <Link to="/login" className={styles.navItem}>
                Login
              </Link>
              <Link to="/register" className={`${styles.navItem} ${styles.registerBtn}`}>
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navigation; //