// src/components/Icus.jsx
import React from 'react';
import styles from './Icus.module.css';
import Button from './Button'; // 1. Import Button

// --- Sub-Component: ICUCard ---
const ICUCard = ({ icu, onReserve }) => {
    const isAvailable = icu.status === 'AVAILABLE';
    const statusClass = isAvailable ? styles.statusAvailable : styles.statusReserved;

    return (
        <div className={styles.card}>
            <div className={styles.details}>
                <h4 className={styles.cardTitle}>{icu.hospitalName} - {icu.specialization} ICU</h4>
                <p>Room: {icu.roomNumber} | Location: {icu.locationDescription}</p>
            </div>
            <div className={styles.actions}>
                <span className={`${styles.status} ${statusClass}`}>
                    {icu.status}
                </span>
                {/* 2. Replace the old button */}
                <Button
                    onClick={() => onReserve(icu.id)}
                    disabled={!isAvailable}
                    variant="success"
                    className={styles.actionBtn}
                >
                    {isAvailable ? 'Reserve' : 'Reserved'}
                </Button>
            </div>
        </div>
    );
};

// --- Main Icus List Component ---
const Icus = ({ icuList = [], onReserve, loading }) => {
    if (loading) {
        return <p className={styles.loading}>Loading available ICUs...</p>;
    }

    if (icuList.length === 0) {
        return <p className={styles.noResults}>No ICUs found matching your criteria. Try adjusting filters.</p>;
    }

    return (
        <div className={styles.icuListContainer}>
            {icuList.map(icu => (
                <ICUCard key={icu.id} icu={icu} onReserve={onReserve} />
            ))}
        </div>
    );
};

export default Icus;