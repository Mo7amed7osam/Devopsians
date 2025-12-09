import { useNavigate } from "react-router-dom";
import { safeNavigate } from "../../utils/security";
import styles from "./DashBoardCard.module.css";

function DashboardCard({ title, value, icon, color, route }) {
  const navigate = useNavigate();

  function handleNavigation() {
    if (route) safeNavigate(navigate, route);
  }

  return (
    <div className={`${styles.card} ${color || ""}`} onClick={handleNavigation} style={{ borderColor: color }}>
      <div className={styles.content}>
        <span className={styles.title}>{title}</span>
        {value !== undefined && <span className={styles.value}>{value}</span>}
        <span className={styles.icon}>{icon}</span>
      </div>
    </div>
  );
}

export default DashboardCard;