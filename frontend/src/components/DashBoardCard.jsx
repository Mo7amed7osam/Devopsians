import { useNavigate } from "react-router-dom";
import styles from "./DashboardCard.module.css";

function DashboardCard({ title, icon, color, route }) {
  const navigate = useNavigate();

  function handleNavigation() {
    navigate(route);
  }

  return (
    <div className={`${styles.card} ${color}`} onClick={handleNavigation}>
      <div className={styles.content}>
        <span className={styles.title}>{title}</span>
        <span className={styles.icon}>{icon}</span>
      </div>
    </div>
  );
}

export default DashboardCard;
