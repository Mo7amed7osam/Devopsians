import styles from "./Icus.module.css";
import Skeleton from "../common/Skeleton";

const defaultTranslate = (key, vars) => {
  if (!vars) return key;
  return key.replace(/\{(\w+)\}/g, (_, token) =>
    Object.prototype.hasOwnProperty.call(vars, token) ? String(vars[token]) : ""
  );
};

function Icus({ icuList = [], onReserve, loading, t = defaultTranslate }) {
  const resolveSpecialization = (value) => {
    switch (value) {
      case "Surgical ICU":
        return t("icu.specialization.surgical");
      case "Cardiac ICU":
        return t("icu.specialization.cardiac");
      case "Neonatal ICU":
        return t("icu.specialization.neonatal");
      case "Pediatric ICU":
        return t("icu.specialization.pediatric");
      case "Neurological ICU":
        return t("icu.specialization.neurological");
      default:
        return value;
    }
  };

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
        <p>{t("icu.noIcus")}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <ul className={styles.icuList}>
        {icuList.map((item) => {
          const isGrouped = typeof item.availableCount === "number";
          const hospitalName =
            item.hospitalName || item.hospital?.name || t("icu.unknownHospital");
          const address = item.address || item.hospital?.address || t("icu.distanceUnavailable");
          const specializationList = item.specializations
            ? item.specializations.map((name) => resolveSpecialization(name))
            : [];
          const reserveIcuId = item.reserveIcuId || item._id || item.id;
          const isReserveDisabled = !reserveIcuId || item.isReserved;

          return (
            <li key={reserveIcuId || hospitalName} className={styles.icuItem}>
              <h3 className={styles.hospitalName}>{hospitalName}</h3>
              <p className={styles.distance}>{address}</p>
              {isGrouped ? (
                <>
                  <p className={styles.availableCount}>
                    {t("icu.availableCount", { count: item.availableCount })}
                  </p>
                  {specializationList.length > 0 && (
                    <p className={styles.specialization}>
                      {t("icu.specializations")}: {specializationList.join(", ")}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className={styles.specialization}>
                    {t("patient.specialization")}: {resolveSpecialization(item.specialization)}
                  </p>
                  <p className={styles.fees}>{t("patient.dailyFee")}: {item.fees} EGP/day</p>
                  <p className={styles.status}>
                    {t("patient.status")}: <span className={styles.available}>{item.status}</span>
                  </p>
                </>
              )}
              <button
                onClick={() => reserveIcuId && onReserve(reserveIcuId)}
                className={styles.reserveButton}
                disabled={isReserveDisabled}
              >
                {isReserveDisabled ? t("common.unavailable") : t("common.reserve")}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default Icus;
