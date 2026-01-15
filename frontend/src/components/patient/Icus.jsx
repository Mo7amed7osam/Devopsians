import styles from "./Icus.module.css";
import Skeleton from "../common/Skeleton";

function Icus({ icuList = [], onReserve, loading }) {
  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.skeletonList}>
          {[...Array(3)].map((_, index) => (
            <div key={index} className={styles.skeletonCard}>
              <Skeleton variant="title" />
              <Skeleton count={3} />
              <Skeleton variant="line" />
            </div>
          ))}
        </div>
      </div>
    );
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
        {icuList.map((item) => {
          const isGrouped = typeof item.availableCount === "number";
          const hospitalName = item.hospitalName || item.hospital?.name || "Unknown Hospital";
          const address = item.address || item.hospital?.address || "Location unavailable";
          const reserveIcuId = item.reserveIcuId || item._id || item.id;
          const isReserveDisabled = !reserveIcuId || item.isReserved;

          return (
            <li key={reserveIcuId || hospitalName} className={styles.icuItem}>
              <h3 className={styles.hospitalName}>{hospitalName}</h3>
              <p className={styles.distance}>{address}</p>
              {isGrouped ? (
                <>
                  <p className={styles.availableCount}>
                    Available ICUs: {item.availableCount}
                  </p>
                  {item.specializations && item.specializations.length > 0 && (
                    <p className={styles.specialization}>
                      Specializations: {item.specializations.join(", ")}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className={styles.specialization}>
                    Specialization: {item.specialization}
                  </p>
                  <p className={styles.fees}>Fee: {item.fees} EGP/day</p>
                  <p className={styles.status}>
                    Status: <span className={styles.available}>{item.status}</span>
                  </p>
                </>
              )}
              <button
                onClick={() => reserveIcuId && onReserve(reserveIcuId)}
                className={styles.reserveButton}
                disabled={isReserveDisabled}
              >
                {isReserveDisabled ? "Unavailable" : "Reserve ICU"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default Icus;
