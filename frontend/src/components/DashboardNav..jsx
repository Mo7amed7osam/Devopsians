// src/components/DashboardNav.jsx
import React from 'react';
import styles from './DashboardNav.module.css';
import Button from './Button';

const DashboardNav = ({ tabs, activeTab, setActiveTab }) => {
  return (
    <nav className={styles.navContainer}>
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          className={`${styles.navButton} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </Button>
      ))}
    </nav>
  );
};

export default DashboardNav;