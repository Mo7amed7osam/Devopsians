// src/pages/LandingPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LandingPage.module.css'; //
import Button from '../components/Button'; //
import { useAuth } from '../contexts/AuthContext'; //

const LandingPage = () => {
    const navigate = useNavigate();
    const { isDarkMode } = useAuth(); // Get dark mode state

    const handleFindIcuClick = () => {
        navigate('/find-icu');
    };

    // Construct class name for dark mode
    const containerClasses = `${styles.pageContainer} ${isDarkMode ? styles.darkMode : ''}`;

    return (
        <div className={containerClasses}>
            {/* --- Hero Section --- */}
            <section className={styles.heroSection}>
                <div className={styles.heroContent}>
                    {/* --- UPDATED HEADLINE --- */}
                    <h1>Your Lifeline to Immediate ICU Care</h1>
                    <p className={styles.subtitle}>
                        Locate and reserve the nearest available Intensive Care Unit (ICU) in real-time across our hospital network. Speed and accuracy when it matters most.
                         Our intuitive platform gives you peace of mind during critical moments.
                    </p>
                    <Button
                        onClick={handleFindIcuClick}
                        variant="primary" // Variant prop might be less relevant due to specific class styling
                        className={styles.ctaButton}
                    >
                        Find Nearest ICU Now
                        <i className="fas fa-search-location" style={{ marginLeft: '10px' }}></i>
                    </Button>
                </div>
            </section>

            {/* --- How It Works Section --- */}
            <section className={styles.howItWorksSection}>
                 {/* --- UPDATED TITLE --- */}
                <h2>Simple Steps to Secure Care</h2>
                <div className={styles.stepsGrid}>
                    <div className={styles.stepCard}>
                        <div className={styles.iconWrapper}>
                            <i className="fas fa-map-marked-alt"></i>
                        </div>
                         {/* --- UPDATED STEP --- */}
                        <h3>1. Locate Nearby ICUs</h3>
                        <p>Use our interactive map to find hospitals with ICU availability near you or your patient's location.</p>
                    </div>
                    <div className={styles.stepCard}>
                        <div className={styles.iconWrapper}>
                            <i className="fas fa-eye"></i>
                        </div>
                        {/* --- UPDATED STEP --- */}
                        <h3>2. Verify Real-Time Availability</h3>
                        <p>Instantly see up-to-the-minute bed status, unit specialization, and essential hospital information.</p>
                    </div>
                    <div className={styles.stepCard}>
                         <div className={styles.iconWrapper}>
                           <i className="fas fa-calendar-check"></i>
                        </div>
                         {/* --- UPDATED STEP --- */}
                        <h3>3. Secure Your Reservation</h3>
                        <p>Log in to the patient portal to reserve an available ICU bed immediately, confirming your spot.</p>
                    </div>
                </div>
            </section>

             {/* --- Statistics Section --- */}
            <section className={styles.statsSection}>
                 <div className={styles.statsGrid}>
                     <div>
                         <span className={styles.statNumber}>15+</span>
                         <span className={styles.statLabel}>Hospitals Connected</span>
                     </div>
                     <div>
                          <span className={styles.statNumber}>99%</span>
                         <span className={styles.statLabel}>Real-Time Accuracy</span>
                     </div>
                     <div>
                          <span className={styles.statNumber}>24/7</span>
                         <span className={styles.statLabel}>System Availability</span>
                     </div>
                 </div>
            </section>
            {/* --- End of Statistics Section --- */}

            {/* --- Benefits Section --- */}
            <section className={styles.benefitsSection}>
                 {/* --- UPDATED TITLE --- */}
                 <h2>The ICU Reservation Advantage</h2>
                 <div className={styles.benefitsGrid}>
                     <div className={styles.benefitCard}>
                         <div className={styles.iconWrapper}>
                            <i className="fas fa-tachometer-alt"></i>
                         </div>
                          {/* --- UPDATED BENEFIT --- */}
                         <h3>Unmatched Speed</h3>
                         <p>Instantly find available ICUs, eliminating stressful delays and saving critical time in emergencies.</p>
                     </div>
                     <div className={styles.benefitCard}>
                         <div className={styles.iconWrapper}>
                            <i className="fas fa-crosshairs"></i>
                         </div>
                          {/* --- UPDATED BENEFIT --- */}
                         <h3>Verified Availability</h3>
                         <p>Our system uses real-time data feeds, ensuring the ICU availability you see is accurate and trustworthy.</p>
                     </div>
                     <div className={styles.benefitCard}>
                         <div className={styles.iconWrapper}>
                             <i className="fas fa-shield-alt"></i>
                         </div>
                           {/* --- UPDATED BENEFIT --- */}
                         <h3>Extensive & Reliable Network</h3>
                         <p>Gain access to a wide range of specialized ICUs across numerous trusted hospital partners.</p>
                     </div>
                 </div>
            </section>

             {/* --- Testimonial Section (Optional - Add if desired) --- */}
            {/*
            <section className={styles.testimonialSection}>
                <blockquote className={styles.testimonialQuote}>
                    "During a stressful emergency, ICU Reservation was incredibly fast and easy to use. We found an available bed in minutes. Highly recommended!"
                </blockquote>
                <p className={styles.testimonialAuthor}>- A Grateful User</p>
            </section>
            */}

             {/* --- Final Call to Action (Optional - Add if desired) --- */}
            {/*
            <section className={styles.finalCtaSection}>
                <h2>Ready to find the care you need?</h2>
                <Button
                    onClick={handleFindIcuClick}
                    variant="success"
                    className={styles.ctaButton} // Reuse hero button style or create a new one
                 >
                    Search for Available ICUs Now
                </Button>
            </section>
            */}

        </div>
    );
};

export default LandingPage; //