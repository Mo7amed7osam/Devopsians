import { useNavigate } from "react-router-dom";
import { clearSession, getRole, getUserName, getToken } from "../../utils/cookieUtils";
import styles from "./Navigation.module.css";

function Navigation() {
  const navigate = useNavigate();
  const userRole = getRole();
  const userName = getUserName();
  const isLoggedIn = !!getToken();

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  const getRoleBadge = () => {
    const roleColors = {
      admin: styles.adminBadge,
      manager: styles.managerBadge,
      receptionist: styles.receptionistBadge,
      ambulance: styles.ambulanceBadge,
      patient: styles.patientBadge,
    };
    
    return roleColors[userRole] || styles.defaultBadge;
  };

  const capitalizeRole = (role) => {
    if (!role) return "User";
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // If not logged in, show minimal navigation
  if (!isLoggedIn) {
    return (
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.leftSection}>
            <div className={styles.brand} onClick={() => navigate("/")}>
              <svg className={styles.logo} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className={styles.brandText}>ICU Management</span>
            </div>
          </div>
          
          <div className={styles.rightSection}>
            <button onClick={() => navigate("/login")} className={styles.loginButton}>
              <svg className={styles.loginIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 17L15 12L10 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Login</span>
            </button>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.navContent}>
        <div className={styles.leftSection}>
          <div className={styles.brand}>
            <svg className={styles.logo} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className={styles.brandText}>ICU Management</span>
          </div>
        </div>
        
        <div className={styles.rightSection}>
          {/* User Info Display - clicking navigates to role-specific dashboard */}
          <div
            className={styles.userInfo}
            role="button"
            tabIndex={0}
            onClick={() => {
              // Normalize role string then map to dashboard path
              const roleKey = (userRole || '').toString().toLowerCase();
              let dest = '/';
              if (roleKey.includes('admin')) dest = '/admin';
              else if (roleKey.includes('manager')) dest = '/manager';
              else if (roleKey.includes('receptionist')) dest = '/receptionist';
              else if (roleKey.includes('ambulance')) dest = '/ambulance';
              else if (roleKey.includes('patient')) dest = '/patient-dashboard';
              navigate(dest);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault();
                const roleKey = (userRole || '').toString().toLowerCase();
                let dest = '/';
                if (roleKey.includes('admin')) dest = '/admin';
                else if (roleKey.includes('manager')) dest = '/manager';
                else if (roleKey.includes('receptionist')) dest = '/receptionist';
                else if (roleKey.includes('ambulance')) dest = '/ambulance';
                else if (roleKey.includes('patient')) dest = '/patient-dashboard';
                navigate(dest);
              } }}
            title={`Go to ${capitalizeRole(userRole)} dashboard`}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.userAvatar}>
              {userName ? userName.charAt(0).toUpperCase() : userRole?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className={styles.userDetails}>
              <div className={styles.userNameDisplay}>{userName || 'User'}</div>
              <div className={`${styles.userRoleTag} ${getRoleBadge()}`}>
                {capitalizeRole(userRole)}
              </div>
            </div>
          </div>
          
          <button onClick={handleLogout} className={styles.logoutButton}>
            <svg className={styles.logoutIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
