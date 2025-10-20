import { Link } from "react-router-dom";
import styles from "./LandingPage.module.css";
import logo from "../assets/react.svg";

const LandingPage = () => {
  return (
    <div className={styles.landingPage}>
      {/* Navigation */}
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <div className={styles.logoContainer}>
            <img src={logo} alt="ICU Project Logo" className={styles.logo} />
            <span className={styles.logoText}>ICU Project</span>
          </div>
          <ul className={styles.navLinks}>
            <li>
              <Link to="/features" className={styles.navLink}>
                Features
              </Link>
            </li>
            <li>
              <Link to="/about" className={styles.navLink}>
                About
              </Link>
            </li>
            <li>
              <Link to="/contact" className={styles.navLink}>
                Contact
              </Link>
            </li>
          </ul>
          <div className={styles.authButtons}>
            {/* <Link to="/register" className={styles.registerButton}>
              Get Your ICU →
            </Link> */}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Revolutionize Your ICU Management
          </h1>
          <p className={styles.heroSubtitle}>
            Advanced technology for critical care monitoring and management
          </p>
          <div className={styles.heroCTA}>
            <Link to="/register" className={styles.ctaButton}>
              Register Now →
            </Link>
            <Link to="/Login" className={styles.secondaryCTA}>
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className={styles.featuresSection}>
        <div className={styles.featuresContainer}>
          <div className={styles.feature}>
            <svg
              className={styles.featureIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <h3>Enhanced Patient Safety</h3>
            <p>Real-time monitoring and instant alerts</p>
          </div>
          <div className={styles.feature}>
            <svg
              className={styles.featureIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <h3>Comprehensive Patient Management</h3>
            <p>Centralized patient data and tracking</p>
          </div>
          <div className={styles.feature}>
            <svg
              className={styles.featureIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <h3>Performance Insights</h3>
            <p>Advanced analytics and reporting</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>&copy; 2024 ICU Project. All rights reserved.</p>
          <div className={styles.footerLinks}>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
