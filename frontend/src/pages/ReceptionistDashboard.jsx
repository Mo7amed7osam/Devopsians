// src/pages/ReceptionistDashboard.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import styles from './ReceptionistDashboard.module.css';
import Button from '../components/Button';
// 1. Import the new ambulance function
import { fetchActiveReservations, fetchActiveAmbulances } from '../utils/api'; 

const ReceptionistDashboard = () => {
    const [reservations, setReservations] = useState([]);
    const [ambulances, setAmbulances] = useState([]); // 2. Add new state for ambulances
    const [loading, setLoading] = useState(true);

    // 3. Fetch all data on load
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Fetch both sets of data
                const [resResponse, ambResponse] = await Promise.all([
                    fetchActiveReservations(),
                    fetchActiveAmbulances()
                ]);
                
                setReservations(resResponse.data);
                setAmbulances(ambResponse.data.filter(a => a.status === 'EN_ROUTE')); // Only show en_route
            } catch (err) {
                toast.error("Failed to fetch dashboard data.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleCheckIn = (reservationId, patientName, icuRoom) => {
        toast.success(`Checked in ${patientName} to ICU Room ${icuRoom}.`);
        setReservations(prev => prev.filter(res => res.id !== reservationId));
    };

    const handleCheckOut = (e) => {
        e.preventDefault();
        const patientId = e.target.patientId.value;
        if (!patientId) {
            toast.warn("Please enter a Patient ID or Room #.");
            return;
        }
        toast.info(`Patient ${patientId} checked out. ICU set to MAINTENANCE.`);
        e.target.reset();
    };

    return (
        <div className={styles.dashboard}>
            <header className={styles.header}>
                <h1>Receptionist Dashboard</h1>
                <p>Manage patient arrivals, departures, and ambulance coordination.</p>
            </header>

            {/* 4. Add new Ambulance Status Panel */}
            <section className={styles.statusPanel}>
                <h3>Live Ambulance Status</h3>
                {loading ? (
                    <div className={styles.placeholder}>Loading...</div>
                ) : (
                    <div className={styles.ambulanceList}>
                        {ambulances.length === 0 ? (
                            <p className={styles.noAmbulance}>No ambulances currently en route.</p>
                        ) : (
                            ambulances.map(amb => (
                                <div key={amb.id} className={styles.ambulanceItem}>
                                    <span className={`${styles.statusBadge} ${styles.statusEnRoute}`}>EN ROUTE</span>
                                    <div className={styles.ambulanceInfo}>
                                        <strong>{amb.patientName}</strong> (Driver: {amb.driver})
                                    </div>
                                    <div className={styles.ambulanceEta}>
                                        ETA: <strong>{amb.etaMinutes} mins</strong>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </section>

            {/* 5. Keep the existing grid for Check-in/Out */}
            <div className={styles.grid}>
                {/* Check-In Section */}
                <section className={styles.formCard}>
                    <h3>Patient Check-In ({reservations.length} Pending)</h3>
                    {loading ? (
                        <div className={styles.placeholder}>Loading reservations...</div>
                    ) : reservations.length === 0 ? (
                        <div className={styles.placeholder}>No pending arrivals.</div>
                    ) : (
                        <div className={styles.reservationList}>
                            {reservations.map(res => (
                                <div key={res.id} className={styles.reservationItem}>
                                    <div className={styles.patientInfo}>
                                        <span className={styles.patientName}>{res.patientName}</span>
                                        <span className={styles.roomInfo}>To: ICU Room {res.icuRoom} ({res.specialization})</span>
                                    </div>
                                    <Button 
                                        variant="success" 
                                        className={styles.actionBtn}
                                        onClick={() => handleCheckIn(res.id, res.patientName, res.icuRoom)}
                                    >
                                        Check-In
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Check-Out Section */}
                <section className={styles.formCard}>
                    <h3>Patient Check-Out</h3>
                    <p>Discharge a patient and mark their ICU as "Maintenance".</p>
                    <form onSubmit={handleCheckOut} className={styles.checkoutForm}>
                        <input 
                            type="text" 
                            name="patientId"
                            placeholder="Enter Patient ID or Room #" 
                            className={styles.inputField} 
                        />
                        <Button type="submit" variant="secondary">Check-Out Patient</Button>
                    </form>
                </section>
            </div>
        </div>
    );
};

export default ReceptionistDashboard;