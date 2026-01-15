import { useNavigate } from "react-router-dom";
import { safeNavigate } from "../../utils/security";
import styles from "./DashBoardCard.module.css";
import Skeleton from "./Skeleton";

function DashboardCard({ title, value, icon, color, route, loading = false }) {
  const navigate = useNavigate();
  const cardStyle = color ? { "--accent-color": color } : undefined;

  function handleNavigation() {
    if (route) safeNavigate(navigate, route);
  }

  return (
    <div className={`${styles.card}`} onClick={handleNavigation} style={cardStyle}>
      <div className={styles.content}>
        <span className={styles.title}>{title}</span>
        {loading ? (
          <div className={styles.skeletonWrap}>
            <Skeleton variant="title" />
            <Skeleton variant="line" />
          </div>
        ) : (
          value !== undefined && <span className={styles.value}>{value}</span>
        )}
        <span className={styles.icon}>{icon}</span>
      </div>
    </div>
  );
}

export default DashboardCard;
