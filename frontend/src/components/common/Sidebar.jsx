import React from "react";
import { NavLink } from "react-router-dom";
import { getRole, getToken } from "../../utils/cookieUtils";
import styles from "./Sidebar.module.css";

const icons = {
  home: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6.5h-5V21H4a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  building: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20V5a1 1 0 0 1 1-1h9v16M15 20V8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v12M3 20h18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6.5 2a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 15.5 13ZM3 21a6 6 0 0 1 12 0M14 21a5 5 0 0 1 8 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  desk: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10h16M6 10V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3M5 21V10h14v11M9 21v-6h6v6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ambulance: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 16V6a1 1 0 0 1 1-1h9v11M13 10h5l3 4v2H13M7 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm14 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm-10-7h2m-1-1v2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Zm0 0v14m6-12v14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const roleLinks = {
  admin: [
    { label: "Dashboard", to: "/admin", icon: icons.home },
    { label: "Hospitals", to: "/admin", icon: icons.building },
  ],
  manager: [
    { label: "Overview", to: "/manager", icon: icons.home },
    { label: "Receptionists", to: "/manager/receptionists", icon: icons.users },
  ],
  receptionist: [
    { label: "Desk", to: "/receptionist", icon: icons.desk },
  ],
  ambulance: [
    { label: "Dispatch", to: "/ambulance", icon: icons.ambulance },
  ],
  patient: [
    { label: "My Dashboard", to: "/patient-dashboard", icon: icons.home },
    { label: "Request Ambulance", to: "/patient/request-ambulance", icon: icons.ambulance },
    { label: "Find ICU", to: "/find-icu", icon: icons.map },
  ],
};

const Sidebar = () => {
  const token = getToken();
  if (!token) return null;

  const roleKey = (getRole() || "").toString().toLowerCase();
  const links = roleLinks[roleKey] || [{ label: "Home", to: "/" }];

  return (
    <aside className={styles.sidebar} aria-label="Sidebar navigation">
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Workspace</div>
        <div className={styles.navList}>
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ""}`
              }
            >
              <span className={styles.icon} aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Quick Actions</div>
        <div className={styles.quickCard}>
          <p>Use the top bar for profile and logout.</p>
          <p className={styles.accentText}>Your access is role-based.</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
