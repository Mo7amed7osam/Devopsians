// src/pages/PatientHomePage.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { getUserId } from '../../utils/cookieUtils';
import styles from './PatientHomePage.module.css'; 
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ICUSelect from './ICUSelect';

const API_BASE = 'http://localhost:3030';

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
                const patientResponse = await axios.get(`${API_BASE}/user/details/${userId}`);
                const patient = patientResponse.data.user;
                setPatientData(patient);
                setNewMedicalHistory(patient.medicalHistory || '');
                // Do not fetch assigned doctor details (doctor role removed)
            } catch (error) {
                console.error('Error fetching patient data:', error);
                toast.error('Failed to load patient data. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchPatientData();
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
            await axios.patch(`${API_BASE}/user/update/${userId}`, {
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

    if (loading) return <div className={styles.loadingState}>Loading patient dashboard...</div>;
    if (!patientData) return <div className={styles.errorState}>Could not load patient data.</div>;

    // If patient doesn't have an ICU reserved, show ICU selection
    if (!icuData && !patientData.reservedICU) {
        return (
            <div className={styles.dashboard}>
                <header className={styles.header}>
                    <h2 className={styles.welcomeTitle}>Welcome, {patientData.firstName} {patientData.lastName}</h2>
                    <div className={styles.icuStatus} style={{ color: '#ff9800' }}>
                        <i className="fas fa-info-circle"></i> You don't have an ICU reserved yet. Please select one below.
                    </div>
                </header>
                <ICUSelect />
            </div>
        );
    }

    return (
        <div className={styles.dashboard}>
            <header className={styles.header}>
                <h2 className={styles.welcomeTitle}>Welcome, {patientData.firstName} {patientData.lastName}</h2>
                <div className={styles.icuStatus}>
                    <i className="fas fa-heartbeat"></i> Reserved ICU: <strong>{icuData?.specialization || 'None'}</strong>
                </div>
            </header>
            <section className={styles.infoGrid}>
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
