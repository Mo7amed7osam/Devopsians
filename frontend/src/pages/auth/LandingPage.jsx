// src/pages/LandingPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { safeNavigate } from '../../utils/security';
import styles from './LandingPage.module.css';
import Button from '../../components/common/Button';
import { useAuth } from '../../contexts/AuthContext';

const LandingPage = () => {
    const navigate = useNavigate();
    const { isDarkMode } = useAuth();

    const handleFindIcuClick = () => {
        safeNavigate(navigate, '/find-icu');
    };

    const handleLoginClick = () => {
        safeNavigate(navigate, '/login');
    };

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        handleFindIcuClick();
    };

    const containerClasses = `${styles.pageContainer} ${isDarkMode ? styles.darkMode : ''}`;

    return (
        <div className={containerClasses}>
            <section className={styles.heroSection}>
                <div className={styles.container}>
                    <div className={styles.heroGrid}>
                        <div className={styles.heroLeft}>
                            <span className={styles.eyebrow}>ICU Management Platform</span>
                            <h1>Find critical ICU care fast.</h1>
                            <p className={styles.subtitle}>
                                Real-time ICU availability across trusted hospitals.
                                Reserve confidently when every minute matters.
                            </p>
                            <form className={styles.searchBar} onSubmit={handleSearchSubmit}>
                                <label className={styles.srOnly} htmlFor="icu-search">
                                    Search hospitals, cities, or specializations
                                </label>
                                <input
                                    id="icu-search"
                                    type="text"
                                    placeholder="Search hospitals, cities, or specializations"
                                />
                                <button type="submit" className={styles.searchButton}>
                                    Search
                                </button>
                            </form>
                            <button
                                type="button"
                                className={styles.locationLink}
                                onClick={handleFindIcuClick}
                            >
                                Use my location
                            </button>
                            <div className={styles.ctaRow}>
                                <Button
                                    onClick={handleFindIcuClick}
                                    variant="primary"
                                    className={styles.primaryCta}
                                >
                                    Find ICU now
                                </Button>
                                <Button
                                    onClick={handleLoginClick}
                                    variant="secondary"
                                    className={styles.secondaryCta}
                                >
                                    Login
                                </Button>
                            </div>
                        </div>
                        <div className={styles.heroRight}>
                            <div className={styles.previewCard}>
                                <div className={styles.previewHeader}>
                                    <div>
                                        <span className={styles.previewLabel}>Live ICU Status</span>
                                        <h3>Availability Snapshot</h3>
                                    </div>
                                    <span className={styles.previewBadge}>Updated now</span>
                                </div>
                                <div className={styles.previewList}>
                                    <div className={styles.previewRow}>
                                        <div>
                                            <p className={styles.previewTitle}>Al-Rayan Hospital</p>
                                            <p className={styles.previewMeta}>Medical ICU - 3 beds</p>
                                        </div>
                                        <span className={`${styles.statusBadge} ${styles.statusAvailable}`}>
                                            Available
                                        </span>
                                    </div>
                                    <div className={styles.previewRow}>
                                        <div>
                                            <p className={styles.previewTitle}>City Care Center</p>
                                            <p className={styles.previewMeta}>Cardiac ICU - 1 bed</p>
                                        </div>
                                        <span className={`${styles.statusBadge} ${styles.statusLimited}`}>
                                            Limited
                                        </span>
                                    </div>
                                    <div className={styles.previewRow}>
                                        <div>
                                            <p className={styles.previewTitle}>Nile Health</p>
                                            <p className={styles.previewMeta}>Surgical ICU - 0 beds</p>
                                        </div>
                                        <span className={`${styles.statusBadge} ${styles.statusBusy}`}>
                                            Full
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.previewFooter}>
                                    <div>
                                        <p className={styles.previewFooterLabel}>Avg. response time</p>
                                        <p className={styles.previewFooterValue}>Under 2 minutes</p>
                                    </div>
                                    <div className={styles.previewFooterDivider} />
                                    <div>
                                        <p className={styles.previewFooterLabel}>Coverage</p>
                                        <p className={styles.previewFooterValue}>24/7 across partner hospitals</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={styles.trustStrip}>
                        <span>Real-time availability</span>
                        <span className={styles.trustDivider}>|</span>
                        <span>Role-based access</span>
                        <span className={styles.trustDivider}>|</span>
                        <span>Secure workflow</span>
                    </div>
                </div>
            </section>

            <section id="how-it-works" className={styles.stepsSection}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2>Simple steps to secure care</h2>
                        <p>Find, verify, and reserve ICU beds in minutes.</p>
                    </div>
                    <div className={styles.stepsGrid}>
                        <div className={styles.stepCard}>
                            <div className={styles.iconWrapper}>
                                <i className="fas fa-map-marked-alt"></i>
                            </div>
                            <h3>Locate nearby ICUs</h3>
                            <p>Search hospitals based on distance and specialization in seconds.</p>
                        </div>
                        <div className={styles.stepCard}>
                            <div className={styles.iconWrapper}>
                                <i className="fas fa-eye"></i>
                            </div>
                            <h3>Verify live availability</h3>
                            <p>See real-time bed status, unit details, and hospital contacts.</p>
                        </div>
                        <div className={styles.stepCard}>
                            <div className={styles.iconWrapper}>
                                <i className="fas fa-calendar-check"></i>
                            </div>
                            <h3>Reserve instantly</h3>
                            <p>Confirm an ICU bed and coordinate pickup when needed.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.statsSection}>
                <div className={styles.container}>
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <span className={styles.statNumber}>15+</span>
                            <span className={styles.statLabel}>Hospitals connected</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statNumber}>99%</span>
                            <span className={styles.statLabel}>Real-time accuracy</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statNumber}>24/7</span>
                            <span className={styles.statLabel}>System availability</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.benefitsSection}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2>Why teams trust ICU Reservation</h2>
                        <p>Designed for clarity, speed, and secure coordination.</p>
                    </div>
                    <div className={styles.benefitsGrid}>
                        <div className={styles.benefitCard}>
                            <div className={styles.iconWrapper}>
                                <i className="fas fa-tachometer-alt"></i>
                            </div>
                            <h3>Fast triage decisions</h3>
                            <p>Surface ICU availability quickly so teams can act without delays.</p>
                        </div>
                        <div className={styles.benefitCard}>
                            <div className={styles.iconWrapper}>
                                <i className="fas fa-crosshairs"></i>
                            </div>
                            <h3>Verified data</h3>
                            <p>Live updates keep availability and bed details accurate.</p>
                        </div>
                        <div className={styles.benefitCard}>
                            <div className={styles.iconWrapper}>
                                <i className="fas fa-shield-alt"></i>
                            </div>
                            <h3>Secure workflow</h3>
                            <p>Role-based access ensures each team member sees only what they need.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
