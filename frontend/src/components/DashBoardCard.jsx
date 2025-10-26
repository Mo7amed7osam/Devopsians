// src/components/DashBoardCard.jsx
import React from 'react';
import styles from './DashBoardCard.module.css';

// Props: title (string), value (string/number), icon (React element/string), color (for styling)
const DashBoardCard = ({ title, value, icon, color = '#007bff' }) => {
  return (
    <div className={styles.card} style={{ borderLeftColor: color }}>
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.value}>{value}</p>
      </div>
      {icon && <div className={styles.icon}>{icon}</div>}
    </div>
  );
};

export default DashBoardCard;