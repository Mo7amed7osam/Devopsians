// src/pages/PatientHomePage.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getUserId } from '../../utils/cookieUtils';
import { cancelICUReservation, getICUById, showUserDetails, updateUserMedicalDetails } from '../../utils/api';
import socket from '../../utils/socket';
import styles from './PatientHomePage.module.css'; 
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import SecureTextarea from '../../components/common/SecureTextarea';
import ICUSelect from './ICUSelect';
import Skeleton from '../../components/common/Skeleton';
import { useNavigate } from 'react-router-dom';
import usePatientLocale from '../../hooks/usePatientLocale';

import { safeNavigate } from '../../utils/security';

const PatientHomePage = () => {
    const [patientData, setPatientData] = useState(null);
    const [icuData, setIcuData] = useState(null);
    const navigate = useNavigate();
    const { t, dir, locale, setLocale } = usePatientLocale();
    // Doctor role removed — no doctor-specific data fetched
    const [newMedicalHistory, setNewMedicalHistory] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalType, setModalType] = useState(null);
    const [ratingTarget, setRatingTarget] = useState('');
    const [currentRating, setCurrentRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [ratingComment, setRatingComment] = useState('');
    const [ratings, setRatings] = useState({});
    const [cancelLoading, setCancelLoading] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(() => {
        if (typeof window === 'undefined') return true;
        return window.localStorage.getItem('patient_onboarding_hidden') !== '1';
    });
    const [liveConnected, setLiveConnected] = useState(socket?.connected ?? false);
    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

    useEffect(() => {
        const fetchPatientData = async () => {
            try {
                setLoading(true);
                const userId = getUserId();
                if (!userId) {
                    toast.error(t('patient.toastUserIdMissing'));
                    setLoading(false);
                    return;
                }
                const patientResponse = await showUserDetails(userId);
                const patient = patientResponse.data.user;
                setPatientData(patient);
                setNewMedicalHistory(patient.medicalHistory || '');
                setLastUpdatedAt(new Date());
                
                // Fetch ICU details only if patient is checked in (not just reserved)
                if (patient.reservedICU && patient.patientStatus === 'CHECKED_IN') {
                    try {
                        const icuResponse = await getICUById(patient.reservedICU);
                        setIcuData(icuResponse.data);
                    } catch (icuError) {
                        console.error('Error fetching ICU data:', icuError);
                        // Don't show error toast - ICU might not be accessible yet
                    }
                }
            } catch (error) {
                console.error('Error fetching patient data:', error);
                toast.error(t('patient.toastLoadFailed'));
            } finally {
                setLoading(false);
            }
        };
        fetchPatientData();

        // Listen for real-time check-in notification
        const userId = getUserId();
        const handleConnect = () => setLiveConnected(true);
        const handleDisconnect = () => setLiveConnected(false);
        if (socket) {
            socket.on('connect', handleConnect);
            socket.on('disconnect', handleDisconnect);
            setLiveConnected(socket.connected);
        }

        if (userId && socket) {
            socket.on('patientCheckedIn', (data) => {
                if (data.patientId === userId) {
                    toast.success(t('patient.toastCheckedIn', { hospitalName: data.hospitalName, room: data.room }));
                    // Reload patient data to show ICU details
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }
            });

            // Listen for ambulance on the way notification
            socket.on('ambulanceOnTheWay', (data) => {
                if (data.patientId === userId) {
                    toast.success(t('patient.toastAmbulanceOnWay', { message: data.message, hospitalName: data.hospitalName }), {
                        autoClose: 8000,
                        position: "top-center"
                    });
                    // Reload patient data to update status
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }
            });

            // Listen for ambulance approval notification
            socket.on('patientNotification', (data) => {
                console.log('Patient notification received:', data);
                if (data.patientId === userId) {
                    if (data.type === 'ambulance_approved') {
                        toast.info(`${data.message}`, {
                            autoClose: 5000,
                            position: "top-center"
                        });
                    } else if (data.type === 'ambulance_assigned') {
                        toast.success(`${data.message}`, {
                            autoClose: 8000,
                            position: "top-center"
                        });
                    } else if (data.type === 'pickup_request_sent') {
                        toast.info(`${data.message}`, {
                            autoClose: 8000,
                            position: "top-center"
                        });
                    } else if (data.type === 'ambulance_accepted') {
                        toast.success(`${data.message}`, {
                            autoClose: 8000,
                            position: "top-center"
                        });
                        // Reload patient data to update status
                        setTimeout(() => {
                            window.location.reload();
                        }, 2000);
                    }
                }
            });

            // Listen for pickup request from patient reservation
            socket.on('ambulancePickupRequest', (data) => {
                if (data.patientId === userId) {
                    toast.info(t('patient.toastPickupSent'), {
                        autoClose: 5000
                    });
                }
            });

            // Listen for ICU check-out notification
            socket.on('icuCheckOut', (data) => {
                if (data.patientId === userId) {
                    toast.success(t('patient.toastCheckedOut'));
                    // Reload patient data to update status
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }
            });

            // Listen for ICU reservation cancellation
            socket.on('icuReservationCancelled', (data) => {
                if (data.patientId === userId) {
                    toast.info(t('patient.toastReservationCancelled'));
                    // Reload patient data to update status
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }
            });

            // Listen for when an ambulance accepts the pickup
            socket.on('ambulanceAccepted', (data) => {
                console.log('Ambulance accepted event:', data);
                if (data.patientId === userId) {
                    toast.success(t('patient.toastAmbulanceAccepted'), {
                        autoClose: 8000,
                        position: "top-center"
                    });
                    // Reload patient data to update status
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }
            });

            // Listen for patient arrival at hospital
            socket.on('patientArrived', (data) => {
                console.log('Patient arrived event:', data);
                if (data.patientId === userId) {
                    toast.success(t('patient.toastArrived'), {
                        autoClose: 10000,
                        position: "top-center"
                    });
                    // Reload patient data to update status
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }
            });
        }

        // Cleanup socket listeners
        return () => {
            if (socket) {
                socket.off('connect', handleConnect);
                socket.off('disconnect', handleDisconnect);
                socket.off('patientCheckedIn');
                socket.off('ambulanceOnTheWay');
                socket.off('patientNotification');
                socket.off('ambulancePickupRequest');
                socket.off('icuCheckOut');
                socket.off('icuReservationCancelled');
                socket.off('ambulanceAccepted');
                socket.off('patientArrived');
            }
        };
    }, []);

    const dismissOnboarding = () => {
        setShowOnboarding(false);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('patient_onboarding_hidden', '1');
        }
    };

    const formatLastUpdated = () => {
        if (!lastUpdatedAt) return t('common.justNow');
        const diffMs = Date.now() - lastUpdatedAt.getTime();
        const diffMin = Math.max(0, Math.round(diffMs / 60000));
        if (diffMin <= 1) return t('common.justNow');
        return t('common.minutesAgo', { count: diffMin });
    };

    const formatSpecialization = (value) => {
        switch (value) {
            case 'Surgical ICU':
                return t('icu.specialization.surgical');
            case 'Cardiac ICU':
                return t('icu.specialization.cardiac');
            case 'Neonatal ICU':
                return t('icu.specialization.neonatal');
            case 'Pediatric ICU':
                return t('icu.specialization.pediatric');
            case 'Neurological ICU':
                return t('icu.specialization.neurological');
            default:
                return value || '—';
        }
    };

    const closeModal = () => {
        setModalType(null);
        setCurrentRating(0);
        setHoverRating(0);
        setRatingComment('');
    };

    const handleRate = (type) => {
        // Prevent opening modal if one is already open
        if (modalType) {
            return;
        }
        setRatingTarget(type);
        setCurrentRating(ratings[type] || 0); 
        setModalType('rating');
    };

    const handleRatingSubmit = async (e) => {
        e.preventDefault();
        if (currentRating === 0) {
            toast.error(t('patient.toastRatingRequired'));
            return;
        }
        setRatings(prev => ({ ...prev, [ratingTarget]: currentRating }));
        toast.success(t('patient.toastRatingThanks', { target: ratingTarget }));
        closeModal();
    };
    const handleCancelReservation = async () => {
        if (!patientData?.reservedICU) {
            toast.error(t('patient.toastNoReservation'));
            return;
        }

        if (!window.confirm(t('patient.toastCancelConfirm'))) {
            return;
        }

        try {
            setCancelLoading(true);
            const userId = getUserId();
            
            console.log('Cancelling reservation:', {
                icuId: patientData.reservedICU,
                patientId: userId
            });
            
            await cancelICUReservation({
                icuId: patientData.reservedICU,
                patientId: userId
            });
            
            toast.success(t('patient.toastCancelSuccess'));
            
            // Update local state immediately
            setPatientData(prev => ({
                ...prev,
                reservedICU: null,
                patientStatus: null
            }));
            setIcuData(null);
            
            // Refresh the page after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error) {
            console.error('Error cancelling reservation:', error);
            console.error('Error response:', error.response?.data);
            console.error('Full error:', JSON.stringify(error.response?.data, null, 2));
            const errorMessage = error.response?.data?.message || t('patient.toastCancelFailed');
            toast.error(errorMessage);
        } finally {
            setCancelLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingState}>
                <Skeleton variant="title" />
                <Skeleton count={3} />
                <div className={styles.loadingGrid}>
                    <div className={styles.loadingCard}>
                        <Skeleton variant="title" />
                        <Skeleton count={4} />
                    </div>
                    <div className={styles.loadingCard}>
                        <Skeleton variant="title" />
                        <Skeleton variant="block" />
                    </div>
                </div>
            </div>
        );
    }
    if (!patientData) return <div className={styles.errorState}>{t('patient.loadFailed')}</div>;

    // If patient doesn't have an ICU reserved or is waiting for check-in approval
    if (!patientData.reservedICU || patientData.patientStatus === 'RESERVED') {
        return (
            <div className={styles.dashboard} dir={dir} lang={locale}>
                <header className={styles.header}>
                    <div className={styles.localeToggle}>
                        <button
                            type="button"
                            className={`${styles.localeButton} ${locale === 'en' ? styles.localeActive : ''}`}
                            onClick={() => setLocale('en')}
                        >
                            {t('lang.english')}
                        </button>
                        <button
                            type="button"
                            className={`${styles.localeButton} ${locale === 'ar' ? styles.localeActive : ''}`}
                            onClick={() => setLocale('ar')}
                        >
                            {t('lang.arabic')}
                        </button>
                    </div>
                    <h2 className={styles.welcomeTitle}>{t('patient.welcome', { name: `${patientData.firstName} ${patientData.lastName}` })}</h2>
                    <div className={styles.statusMeta}>
                        <span className={`${styles.liveDot} ${liveConnected ? styles.liveOn : styles.liveOff}`} />
                        <span className={styles.liveText}>{liveConnected ? t('common.live') : t('common.offline')}</span>
                        <span className={styles.updatedText}>{t('common.lastUpdated', { time: formatLastUpdated() })}</span>
                    </div>
                    {patientData.patientStatus === 'RESERVED' ? (
                        <div className={`${styles.icuStatus} ${styles.icuStatusPending}`}>
                            <i className="fas fa-clock"></i> {t('patient.pendingReservation')}
                        </div>
                    ) : (
                        <div className={`${styles.icuStatus} ${styles.icuStatusNotice}`}>
                            <i className="fas fa-info-circle"></i> {t('patient.noReservation')}
                        </div>
                    )}
                </header>
                {showOnboarding && (
                    <div className={styles.onboardingCard}>
                        <div>
                            <h3>{t('patient.gettingStarted')}</h3>
                            <ul>
                                <li>{t('patient.stepChoose')}</li>
                                <li>{t('patient.stepReserve')}</li>
                                <li>{t('patient.stepPickup')}</li>
                                <li>{t('patient.stepTrack')}</li>
                            </ul>
                        </div>
                        <Button variant="secondary" onClick={dismissOnboarding}>
                            {t('common.dismiss')}
                        </Button>
                    </div>
                )}
                {!patientData.reservedICU && <ICUSelect embedded />}
            </div>
        );
    }

    // Show ambulance status for patients awaiting pickup or in transit
    const showAmbulanceStatus = patientData.patientStatus === 'AWAITING_PICKUP' || 
                                 patientData.patientStatus === 'IN_TRANSIT' ||
                                 patientData.patientStatus === 'ARRIVED';

    return (
        <div className={styles.dashboard} dir={dir} lang={locale}>
            <header className={styles.header}>
                <div className={styles.localeToggle}>
                    <button
                        type="button"
                        className={`${styles.localeButton} ${locale === 'en' ? styles.localeActive : ''}`}
                        onClick={() => setLocale('en')}
                    >
                        {t('lang.english')}
                    </button>
                    <button
                        type="button"
                        className={`${styles.localeButton} ${locale === 'ar' ? styles.localeActive : ''}`}
                        onClick={() => setLocale('ar')}
                    >
                        {t('lang.arabic')}
                    </button>
                </div>
                <h2 className={styles.welcomeTitle}>{t('patient.welcome', { name: `${patientData.firstName} ${patientData.lastName}` })}</h2>
                <div className={styles.statusMeta}>
                    <span className={`${styles.liveDot} ${liveConnected ? styles.liveOn : styles.liveOff}`} />
                    <span className={styles.liveText}>{liveConnected ? t('common.live') : t('common.offline')}</span>
                    <span className={styles.updatedText}>{t('common.lastUpdated', { time: formatLastUpdated() })}</span>
                </div>
                <div className={styles.icuStatus}>
                    <i className="fas fa-heartbeat"></i> {t('patient.reservedIcu')}: <strong>{icuData?.specialization || '—'}</strong>
                </div>

                {/* Ambulance Status Banner */}
                {showAmbulanceStatus && (
                    <div className={`${styles.ambulanceBanner} ${
                        patientData.patientStatus === 'AWAITING_PICKUP'
                            ? styles.bannerPending
                            : patientData.patientStatus === 'IN_TRANSIT'
                                ? styles.bannerTransit
                                : styles.bannerArrived
                    }`}>
                        <h3 className={styles.bannerTitle}>
                            {patientData.patientStatus === 'AWAITING_PICKUP' && t('patient.ambulanceRequested')}
                            {patientData.patientStatus === 'IN_TRANSIT' && t('patient.ambulanceEnRoute')}
                            {patientData.patientStatus === 'ARRIVED' && t('patient.arrived')}
                        </h3>
                        <p className={styles.bannerText}>
                            {patientData.patientStatus === 'AWAITING_PICKUP' && 
                                t('patient.bannerPending')}
                            {patientData.patientStatus === 'IN_TRANSIT' && 
                                t('patient.bannerTransit')}
                            {patientData.patientStatus === 'ARRIVED' && 
                                t('patient.bannerArrived')}
                        </p>
                        {patientData.pickupLocation && (
                            <p className={styles.bannerSubtext}>
                                <strong>{t('patient.pickupLocation')}:</strong> {patientData.pickupLocation}
                            </p>
                        )}
                        <div className={styles.bannerAction}>
                            <Button
                                variant="primary"
                                onClick={() => safeNavigate(navigate, '/patient/request-ambulance')}
                            >
                                {t('patient.trackAmbulance')}
                            </Button>
                        </div>
                    </div>
                )}

                {patientData.reservedICU && (
                    <Button 
                        onClick={handleCancelReservation} 
                        disabled={cancelLoading}
                        variant="danger"
                        className={styles.cancelButton}
                    >
                        {cancelLoading ? t('patient.cancelling') : t('patient.cancelReservation')}
                    </Button>
                )}
            </header>
            <section className={styles.infoGrid}>
                {icuData && (
                    <div className={styles.card}>
                        <h3>{t('patient.yourIcu')}</h3>
                        <p><strong>{t('patient.hospital')}:</strong> {icuData.hospital?.name || '—'}</p>
                        <p><strong>{t('patient.specialization')}:</strong> {formatSpecialization(icuData.specialization)}</p>
                        <p><strong>{t('patient.status')}:</strong> <span className={styles.statusAvailable}>{icuData.status}</span></p>
                        <p><strong>{t('patient.dailyFee')}:</strong> {icuData.fees} EGP</p>
                    </div>
                )}
                <div className={styles.card}>
                    <h3>{t('patient.totalFees')}</h3>
                    <p className={styles.feeAmount}>EGP {(patientData.totalFees || 0).toFixed(2)}</p>
                    {patientData.reservedICU && patientData.patientStatus === 'CHECKED_IN' && (
                        <p className={patientData.feesPaid === true ? styles.feePaid : styles.feeUnpaid}>
                            {patientData.feesPaid === true ? t('patient.feePaid') : t('patient.feeUnpaid')}
                        </p>
                    )}
                </div>
            </section>
            <section className={styles.reservationActions}>
                <div className={styles.actionGroup}>
                    <h3>{t('patient.feedback')}</h3>
                    <Button onClick={() => handleRate(t('patient.hospital'))} className={styles.btnRate}>{t('patient.rateHospital')}</Button>
                </div>
            </section>
            <Modal isOpen={modalType === 'rating'} onClose={closeModal} contentLabel="rating-modal">
                <h2>{t('patient.rateTarget', { target: ratingTarget })}</h2>
                <form onSubmit={handleRatingSubmit}>
                    <div className={styles.starRating}>
                        {[...Array(5)].map((_, index) => {
                            const ratingValue = index + 1;
                            return (
                                <span 
                                    key={ratingValue} 
                                    className={ratingValue <= (hoverRating || currentRating) ? styles.starFilled : styles.starEmpty}
                                    onClick={() => setCurrentRating(ratingValue)}
                                    onMouseEnter={() => setHoverRating(ratingValue)}
                                    onMouseLeave={() => setHoverRating(0)}
                                >
                                    *
                                </span>
                            );
                        })}
                    </div>
                    <SecureTextarea 
                        name="ratingComment"
                        className={styles.modalTextarea}
                        placeholder={t('patient.ratingPlaceholder')}
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                        maxLength={500}
                    />
                    <Button type="submit" variant="primary" className={styles.modalSubmit}>{t('common.submit')}</Button>
                </form>
            </Modal>
        </div>
    );
};

export default PatientHomePage;
