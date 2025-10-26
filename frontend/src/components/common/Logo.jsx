// src/components/Logo.jsx
import React from 'react';
import styles from './Logo.module.css'; //

const Logo = () => {
  return (
    <div className={styles.logoContainer}>
      <img
          src="/icuLogo.png"
          alt="ICU Reservation Logo"
          className={styles.logoImage}
      />
      <span className={styles.logoText}>ICU Reservation</span>
    </div>
  );
};

export default Logo; //