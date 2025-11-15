import { useState } from "react";
import styles from "./Icus.module.css";

function Icus({ icuList = [], onReserve, loading }) {
  if (loading) {
    return <div className={styles.loading}>Loading ICUs...</div>;
  }

  if (!icuList || icuList.length === 0) {
    return (
      <div className={styles.noIcus}>
        <p>No ICUs available at the moment.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <ul className={styles.icuList}>
        {icuList.map((icu) => (
          <li key={icu._id || icu.id} className={styles.icuItem}>
            <h3 className={styles.hospitalName}>
              {icu.hospital?.name || "Unknown Hospital"}
            </h3>
            <p className={styles.specialization}>
              Specialization: {icu.specialization}
            </p>
            <p className={styles.distance}>
              {icu.hospital?.address || "Location unavailable"}
            </p>
            <p className={styles.fees}>Fee: {icu.fees} EGP/day</p>
            <p className={styles.status}>
              Status: <span className={styles.available}>{icu.status}</span>
            </p>
            <button
              onClick={() => onReserve(icu._id || icu.id)}
              className={styles.reserveButton}
              disabled={icu.isReserved || (icu.status || '').toLowerCase() !== 'available'}
            >
              {icu.isReserved ? 'Reserved' : 'Reserve'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Icus;
