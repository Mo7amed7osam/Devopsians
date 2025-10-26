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
          <li key={icu.id} className={styles.icuItem}>
            <h3 className={styles.hospitalName}>
              {icu.hospitalName || "Unknown Hospital"}
            </h3>
            <p className={styles.specialization}>
              Specialization: {icu.specialization}
            </p>
            <p className={styles.distance}>Distance: {icu.distance}</p>
            <p className={styles.fees}>Fee: {icu.fee}</p>
            <button
              onClick={() => onReserve(icu.id)}
              className={styles.reserveButton}
            >
              Reserve
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Icus;
