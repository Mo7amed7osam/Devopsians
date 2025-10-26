// src/pages/PatientHomePage.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { updateMedicalHistory, reserveVisitorsRoom, rateDoctorAndHospital } from '../utils/api';
import styles from './PatientHomePage.module.css'; 
import Button from '../components/Button';
import Modal from '../components/Modal'; // Assuming Modal.jsx is in src/components/

const PatientHomePage = () => {
    const [patientData, setPatientData] = useState(null);
    const [newMedicalHistory, setNewMedicalHistory] = useState('');
    const [loading, setLoading] = useState(true);

    // --- State for Modals ---
    const [modalType, setModalType] = useState(null); // 'rating', 'visitor', or 'kids'
    const [ratingTarget, setRatingTarget] = useState(''); // 'Doctor' or 'Hospital'
    
    // States for the Rating Modal
    const [currentRating, setCurrentRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [ratingComment, setRatingComment] = useState('');
    const [ratings, setRatings] = useState({}); // Simulates saved ratings { Doctor: 5, Hospital: 4 }

    // --- Data Fetching ---
    useEffect(() => {
        const fetchPatientData = async () => {
            const mockData = {
                id: 'pat123',
                name: 'John Doe',
                reservedICU: 'Hospital A - Room 101 (Cardiology)',
                medicalHistory: 'Allergies: Penicillin. Chronic: Asthma.',
                fees: 2500.50,
                medSchedule: [{ time: '8:00 AM', med: 'Med A' }, { time: '6:00 PM', med: 'Med B' }],
                assignedDoctor: { id: 'doc456', name: 'Jane Smith', rating: 4.8 }
            };
            setPatientData(mockData);
            setNewMedicalHistory(mockData.medicalHistory);
            setLoading(false);
        };
        fetchPatientData();
    }, []);

    const closeModal = () => {
        setModalType(null);
        // Reset modal-specific states
        setCurrentRating(0);
        setHoverRating(0);
        setRatingComment('');
    };

    const handleUpdateMedicalHistory = async (e) => {
        e.preventDefault();
        toast.success('Medical history updated successfully!');
        setPatientData(prev => ({ ...prev, medicalHistory: newMedicalHistory }));
    };

    // --- Modal-triggering Handlers ---
    const handleRate = (type) => {
        setRatingTarget(type);
        // If a rating was previously submitted, show it
        setCurrentRating(ratings[type] || 0); 
        setModalType('rating');
    };

    const handleReserveVisitorsRoom = () => setModalType('visitor');
    const handleReserveKidsArea = () => setModalType('kids');

    // --- Form Submission Handlers ---
    const handleRatingSubmit = (e) => {
        e.preventDefault();
        if (currentRating === 0) {
            toast.error('Please select a rating from 1 to 5.');
            return;
        }
        // Update our simulated "saved" ratings
        setRatings(prev => ({ ...prev, [ratingTarget]: currentRating }));
        toast.success(`Thank you for your feedback on the ${ratingTarget}!`);
        closeModal();
    };
    
    const handleVisitorSubmit = (e) => {
        e.preventDefault();
        const visitorName = e.target.visitorName.value;
        const visitTime = e.target.visitTime.value;
        toast.success(`Reservation request for ${visitorName} at ${visitTime} submitted.`);
        closeModal();
    };

    // FIX: Created a separate handler for the Kids Area form to prevent crash
    const handleKidsAreaSubmit = (e) => {
        e.preventDefault();
        const visitTime = e.target.visitTime.value;
        toast.success(`Kids area time slot at ${visitTime} has been requested.`);
        closeModal();
    };

    if (loading) return <div className={styles.loadingState}>Loading patient dashboard...</div>;
    if (!patientData) return <div className={styles.errorState}>Could not load patient data.</div>;

    return (
        <div className={styles.dashboard}>
            <header className={styles.header}>
                <h2 className={styles.welcomeTitle}>Welcome, {patientData.name}</h2>
                <div className={styles.icuStatus}>
                    <i className="fas fa-heartbeat"></i> Reserved ICU: <strong>{patientData.reservedICU || 'None'}</strong>
                </div>
            </header>

            <section className={styles.infoGrid}>
                <div className={styles.card}>
                    <h3>Medicine Schedule</h3>
                    <p>Assigned Doctor: Dr. {patientData.assignedDoctor.name} ({patientData.assignedDoctor.rating} ★)</p>
                    <ul className={styles.scheduleList}>
                        {patientData.medSchedule.map((item, index) => (
                            <li key={index}><strong>{item.time}:</strong> {item.med}</li>
                        ))}
                    </ul>
                </div>

                <div className={styles.card}>
                    <h3>Total Fees</h3>
                    <p className={styles.feeAmount}>EGP {patientData.fees.toFixed(2)}</p>
                    <Button variant="secondary">Show Total Fees</Button>
                </div>

                <div className={`${styles.card} ${styles.ratingCard}`}>
                    <h3 className={styles.subtitle}>Update Medical History</h3>
                    <form onSubmit={handleUpdateMedicalHistory}>
                        <textarea 
                            value={newMedicalHistory} 
                            onChange={(e) => setNewMedicalHistory(e.target.value)}
                            rows="4"
                            required
                        />
                        <Button type="submit" variant="primary">Save History</Button>
                    </form>
                </div>
            </section>
            
            <section className={styles.reservationActions}>
                <div className={styles.actionGroup}>
                    <h3>Reserve Visitor's Room</h3>
                    <Button onClick={handleReserveVisitorsRoom} className={styles.btnAction}>Request Visitor Slot</Button>
                </div>
                <div className={styles.actionGroup}>
                    <h3>Kids Area Access</h3>
                    <Button onClick={handleReserveKidsArea} className={styles.btnAction}>Reserve Time-Slot</Button>
                </div>
                <div className={styles.actionGroup}>
                    <h3>Service Feedback</h3>
                    <Button onClick={() => handleRate('Doctor')} className={styles.btnRate}>Rate Doctor</Button>
                    <Button onClick={() => handleRate('Hospital')} className={styles.btnRate}>Rate Hospital</Button>
                </div>
            </section>

            {/* --- MODALS --- */}
            <Modal isOpen={modalType === 'rating'} onClose={closeModal}>
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

            <Modal isOpen={modalType === 'visitor'} onClose={closeModal}>
                <h2>Reserve a Visitor Slot</h2>
                <form onSubmit={handleVisitorSubmit}>
                    <input className={styles.modalInput} type="text" name="visitorName" placeholder="Visitor's Full Name" required />
                    <input className={styles.modalInput} type="time" name="visitTime" required />
                    <Button type="submit" variant="primary" style={{ width: '100%', marginTop: '20px' }}>Submit Request</Button>
                </form>
            </Modal>

            <Modal isOpen={modalType === 'kids'} onClose={closeModal}>
                <h2>Reserve Kids Area Time-Slot</h2>
                {/* FIX: Using the correct submit handler */}
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