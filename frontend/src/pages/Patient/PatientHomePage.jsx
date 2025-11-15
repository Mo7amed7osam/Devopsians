// src/pages/PatientHomePage.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getUserId } from '../../utils/cookieUtils';
import { cancelICUReservation, getICUById, showUserDetails, updateUserMedicalDetails } from '../../utils/api';
import socket from '../../utils/socket';
import styles from './PatientHomePage.module.css'; 
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ICUSelect from './ICUSelect';

const PatientHomePage = () => {
    const [patientData, setPatientData] = useState(null);
    const [icuData, setIcuData] = useState(null);
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

    useEffect(() => {
        const fetchPatientData = async () => {
            try {
                setLoading(true);
                const userId = getUserId();
                if (!userId) {
                    toast.error('User ID not found. Please log in again.');
                    setLoading(false);
                    return;
                }
                const patientResponse = await showUserDetails(userId);
                const patient = patientResponse.data.user;
                setPatientData(patient);
                setNewMedicalHistory(patient.medicalHistory || '');
                
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
                toast.error('Failed to load patient data. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchPatientData();

        // Listen for real-time check-in notification
        const userId = getUserId();
        if (userId && socket) {
            socket.on('patientCheckedIn', (data) => {
                if (data.patientId === userId) {
                    toast.success(`You have been checked in to ${data.hospitalName} - Room ${data.room}!`);
                    // Reload patient data to show ICU details
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }
            });

            // Listen for ambulance on the way notification
            socket.on('ambulanceOnTheWay', (data) => {
                if (data.patientId === userId) {
                    toast.success(`🚑 ${data.message} Your ambulance is heading to ${data.hospitalName}!`, {
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
                console.log('🔔 Patient notification received:', data);
                if (data.patientId === userId) {
                    if (data.type === 'ambulance_approved') {
                        toast.info(`✅ ${data.message}`, {
                            autoClose: 5000,
                            position: "top-center"
                        });
                    } else if (data.type === 'ambulance_assigned') {
                        toast.success(`🚑 ${data.message}`, {
                            autoClose: 8000,
                            position: "top-center"
                        });
                    } else if (data.type === 'pickup_request_sent') {
                        toast.info(`🚑 ${data.message}`, {
                            autoClose: 8000,
                            position: "top-center"
                        });
                    } else if (data.type === 'ambulance_accepted') {
                        toast.success(`🚑 ${data.message}`, {
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
                    toast.info(`🚑 Your pickup request has been sent to ambulance crew!`, {
                        autoClose: 5000
                    });
                }
            });
        }

        // Cleanup socket listeners
        return () => {
            if (socket) {
                socket.off('patientCheckedIn');
                socket.off('ambulanceOnTheWay');
                socket.off('patientNotification');
                socket.off('ambulancePickupRequest');
            }
        };
    }, []);

    const closeModal = () => {
        setModalType(null);
        setCurrentRating(0);
        setHoverRating(0);
        setRatingComment('');
    };

    const handleUpdateMedicalHistory = async (e) => {
        e.preventDefault();
        try {
            const userId = getUserId();
            await updateUserMedicalDetails(userId, {
                medicalHistory: newMedicalHistory
            });
            toast.success('Medical history updated successfully!');
            setPatientData(prev => ({ ...prev, medicalHistory: newMedicalHistory }));
        } catch (error) {
            console.error('Error updating medical history:', error);
            toast.error('Failed to update medical history.');
        }
    };

    const handleRate = (type) => {
        setRatingTarget(type);
        setCurrentRating(ratings[type] || 0); 
        setModalType('rating');
    };

    const handleRatingSubmit = async (e) => {
        e.preventDefault();
        if (currentRating === 0) {
            toast.error('Please select a rating from 1 to 5.');
            return;
        }
        setRatings(prev => ({ ...prev, [ratingTarget]: currentRating }));
        toast.success(`Thank you for your feedback on the ${ratingTarget}!`);
        closeModal();
    };
    
    const handleVisitorSubmit = async (e) => {
        e.preventDefault();
        const visitorName = e.target.visitorName.value;
        const visitTime = e.target.visitTime.value;
        toast.success(`Reservation request for ${visitorName} at ${visitTime} submitted.`);
        closeModal();
    };

    const handleKidsAreaSubmit = async (e) => {
        e.preventDefault();
        const visitTime = e.target.visitTime.value;
        toast.success(`Kids area time slot at ${visitTime} has been requested.`);
        closeModal();
    };

    const handleCancelReservation = async () => {
        if (!window.confirm('Are you sure you want to cancel your ICU reservation?')) {
            return;
        }

        try {
            setCancelLoading(true);
            const userId = getUserId();
            
            await cancelICUReservation({
                icuId: patientData.reservedICU,
                patientId: userId
            });
            
            toast.success('ICU reservation cancelled successfully!');
            
            // Refresh the page to show ICU selection again
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error) {
            console.error('Error cancelling reservation:', error);
            const errorMessage = error.response?.data?.message || 'Failed to cancel reservation. Please try again.';
            toast.error(errorMessage);
        } finally {
            setCancelLoading(false);
        }
    };

    if (loading) return <div className={styles.loadingState}>Loading patient dashboard...</div>;
    if (!patientData) return <div className={styles.errorState}>Could not load patient data.</div>;

    // If patient doesn't have an ICU reserved or is waiting for check-in approval
    if (!patientData.reservedICU || patientData.patientStatus === 'RESERVED') {
        return (
            <div className={styles.dashboard}>
                <header className={styles.header}>
                    <h2 className={styles.welcomeTitle}>Welcome, {patientData.firstName} {patientData.lastName}</h2>
                    {patientData.patientStatus === 'RESERVED' ? (
                        <div className={styles.icuStatus} style={{ color: '#2196f3' }}>
                            <i className="fas fa-clock"></i> Your ICU reservation is pending. Waiting for receptionist approval...
                        </div>
                    ) : (
                        <div className={styles.icuStatus} style={{ color: '#ff9800' }}>
                            <i className="fas fa-info-circle"></i> You don't have an ICU reserved yet. Please select one below.
                        </div>
                    )}
                </header>
                {!patientData.reservedICU && <ICUSelect />}
            </div>
        );
    }

    // Show ambulance status for patients awaiting pickup or in transit
    const showAmbulanceStatus = patientData.patientStatus === 'AWAITING_PICKUP' || 
                                 patientData.patientStatus === 'IN_TRANSIT' ||
                                 patientData.patientStatus === 'ARRIVED';

    return (
        <div className={styles.dashboard}>
            <header className={styles.header}>
                <h2 className={styles.welcomeTitle}>Welcome, {patientData.firstName} {patientData.lastName}</h2>
                <div className={styles.icuStatus}>
                    <i className="fas fa-heartbeat"></i> Reserved ICU: <strong>{icuData?.specialization || 'None'}</strong>
                </div>

                {/* Ambulance Status Banner */}
                {showAmbulanceStatus && (
                    <div style={{
                        marginTop: '15px',
                        padding: '15px',
                        backgroundColor: patientData.patientStatus === 'AWAITING_PICKUP' ? '#fff3cd' :
                                       patientData.patientStatus === 'IN_TRANSIT' ? '#d1ecf1' :
                                       '#d4edda',
                        border: `2px solid ${patientData.patientStatus === 'AWAITING_PICKUP' ? '#ffc107' :
                                             patientData.patientStatus === 'IN_TRANSIT' ? '#17a2b8' :
                                             '#28a745'}`,
                        borderRadius: '8px',
                        textAlign: 'center'
                    }}>
                        <h3 style={{ margin: '0 0 10px 0' }}>
                            {patientData.patientStatus === 'AWAITING_PICKUP' && '🚑 Ambulance Requested'}
                            {patientData.patientStatus === 'IN_TRANSIT' && '🚐 Ambulance En Route!'}
                            {patientData.patientStatus === 'ARRIVED' && '🏥 You Have Arrived!'}
                        </h3>
                        <p style={{ margin: '5px 0', fontSize: '1.1em' }}>
                            {patientData.patientStatus === 'AWAITING_PICKUP' && 
                                'An ambulance has been assigned to pick you up. The crew will accept shortly.'}
                            {patientData.patientStatus === 'IN_TRANSIT' && 
                                'Your ambulance is on the way to pick you up! Please be ready.'}
                            {patientData.patientStatus === 'ARRIVED' && 
                                'You have arrived at the hospital. The receptionist will check you in shortly.'}
                        </p>
                        {patientData.pickupLocation && (
                            <p style={{ fontSize: '0.9em', marginTop: '5px' }}>
                                <strong>Pickup Location:</strong> {patientData.pickupLocation}
                            </p>
                        )}
                    </div>
                )}

                {patientData.reservedICU && (
                    <Button 
                        onClick={handleCancelReservation} 
                        disabled={cancelLoading}
                        variant="secondary"
                        style={{ marginTop: '10px', backgroundColor: '#d32f2f', color: 'white' }}
                    >
                        {cancelLoading ? 'Cancelling...' : 'Cancel ICU Reservation'}
                    </Button>
                )}
            </header>
            <section className={styles.infoGrid}>
                {icuData && (
                    <div className={styles.card}>
                        <h3>Your Reserved ICU</h3>
                        <p><strong>Hospital:</strong> {icuData.hospital?.name || 'N/A'}</p>
                        <p><strong>Specialization:</strong> {icuData.specialization}</p>
                        <p><strong>Room:</strong> {icuData.room}</p>
                        <p><strong>Status:</strong> <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{icuData.status}</span></p>
                        <p><strong>Daily Fee:</strong> {icuData.fees} EGP</p>
                    </div>
                )}
                <div className={styles.card}>
                    <h3>Medicine Schedule</h3>
                    <p>Assigned Provider: Not available</p>
                    {patientData.medicineSchedule ? (
                        <div>{patientData.medicineSchedule}</div>
                    ) : (
                        <p>No medicine schedule available</p>
                    )}
                </div>
                <div className={styles.card}>
                    <h3>Total Fees</h3>
                    <p className={styles.feeAmount}>EGP {(patientData.totalFees || 0).toFixed(2)}</p>
                    <Button variant="secondary">Show Total Fees</Button>
                </div>
                <div className={`${styles.card} ${styles.ratingCard}`}>
                    <h3 className={styles.subtitle}>Update Medical History</h3>
                    <form onSubmit={handleUpdateMedicalHistory}>
                        <textarea 
                            value={newMedicalHistory} 
                            onChange={(e) => setNewMedicalHistory(e.target.value)}
                            rows="4"
                            placeholder="Enter your medical history, allergies, chronic conditions..."
                            required
                        />
                        <Button type="submit" variant="primary">Save History</Button>
                    </form>
                </div>
            </section>
            <section className={styles.reservationActions}>
                <div className={styles.actionGroup}>
                    <h3>Reserve Visitor's Room</h3>
                    <Button onClick={() => setModalType('visitor')} className={styles.btnAction}>Request Visitor Slot</Button>
                </div>
                <div className={styles.actionGroup}>
                    <h3>Kids Area Access</h3>
                    <Button onClick={() => setModalType('kids')} className={styles.btnAction}>Reserve Time-Slot</Button>
                </div>
                <div className={styles.actionGroup}>
                    <h3>Service Feedback</h3>
                    <Button onClick={() => handleRate('Hospital')} className={styles.btnRate}>Rate Hospital</Button>
                </div>
            </section>
            <Modal isOpen={modalType === 'rating'} onClose={closeModal} contentLabel="rating-modal">
                <h2>Rate the {ratingTarget}</h2>
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
                                    ★
                                </span>
                            );
                        })}
                    </div>
                    <textarea 
                        className={styles.modalTextarea}
                        placeholder="Leave a comment (optional)..."
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                    />
                    <Button type="submit" variant="primary" style={{ width: '100%', marginTop: '20px' }}>Submit Rating</Button>
                </form>
            </Modal>
            <Modal isOpen={modalType === 'visitor'} onClose={closeModal} contentLabel="visitor-modal">
                <h2>Reserve a Visitor Slot</h2>
                <form onSubmit={handleVisitorSubmit}>
                    <input className={styles.modalInput} type="text" name="visitorName" placeholder="Visitor's Full Name" required />
                    <input className={styles.modalInput} type="time" name="visitTime" required />
                    <Button type="submit" variant="primary" style={{ width: '100%', marginTop: '20px' }}>Submit Request</Button>
                </form>
            </Modal>
            <Modal isOpen={modalType === 'kids'} onClose={closeModal} contentLabel="kids-modal">
                <h2>Reserve Kids Area Time-Slot</h2>
                <form onSubmit={handleKidsAreaSubmit}>
                    <p>Please select a 1-hour time slot.</p>
                    <input className={styles.modalInput} type="time" name="visitTime" required />
                    <Button type="submit" variant="primary" style={{ width: '100%', marginTop: '20px' }}>Reserve Slot</Button>
                </form>
            </Modal>
        </div>
    );
};

export default PatientHomePage;
