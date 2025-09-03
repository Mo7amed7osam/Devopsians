import { useState } from "react";
import styles from "./Icus.module.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Icus({ userId, specialization, icus }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleReserveICU = async (icuId) => {
    try {
      await axios.post("http://localhost:3030/patient/reserve-icu", {
        userId,
        icuId,
      });
      alert("ICU reserved successfully!");
      navigate(`/UpdateDetails/${userId}/${icuId}`);
    } catch (err) {
      console.error("Error reserving ICU:", err);
      setError("Failed to reserve ICU. Please try again later.");
    }
  };

  const filteredICUs = icus.filter(
    (icu) => icu.specialization === specialization
  );

  return (
    <div className={styles.container}>
      {error && <div className={styles.error}>{error}</div>}
      {filteredICUs.length === 0 ? (
        <p className={styles.noIcus}>
          No ICUs available for the specialization &quot;{specialization}&quot;
          near your location.
        </p>
      ) : (
        <ul className={styles.icuList}>
          {filteredICUs.map(
            ({ _id, hospital, specialization, fees, status }) => (
              <li key={_id} className={styles.icuItem}>
                <h3 className={styles.hospitalName}>
                  {hospital?.name || "Not assigned"}
                </h3>
                <p className={styles.address}>
                  Address: {hospital?.address || "N/A"}
                </p>
                <p className={styles.specialization}>
                  Specialization: {specialization}
                </p>
                <p className={styles.fees}>Fees: ${fees}</p>
                <button
                  onClick={() => handleReserveICU(_id)}
                  className={styles.reserveButton}
                  disabled={status === "Occupied"}
                  aria-disabled={status === "Occupied"}
                >
                  {status === "Occupied" ? "Reserved" : "Reserve"}
                </button>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

export default Icus;
