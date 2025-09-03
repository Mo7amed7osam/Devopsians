import { useNavigate } from "react-router-dom";
import { clearUserCookies } from "../utils/cookieUtils";
import styles from "./Navigation.module.css";

function Navigation() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearUserCookies();
    navigate("/login");
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.navContent}>
        <div className={styles.brand}>ICU Management System</div>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navigation;
