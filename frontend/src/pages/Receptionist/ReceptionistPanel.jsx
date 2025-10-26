import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import styles from './ReceptionistDashboard.module.css';
import Button from '../../components/common/Button';
import { fetchActiveReservations, fetchActiveAmbulances } from '../../utils/api';

const ReceptionistPanel = () => {
    const [reservations, setReservations] = useState([]);
    const [ambulances, setAmbulances] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [resResponse, ambResponse] = await Promise.all([
                    fetchActiveReservations(),
                    fetchActiveAmbulances()
                ]);
                setReservations(resResponse.data);
                setAmbulances(ambResponse.data.filter(a => a.status === 'EN_ROUTE'));
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
        toast.success(`Checked in  to ICU Room .`);
        setReservations(prev => prev.filter(res => res.id !== reservationId));
    };

    const handleCheckOut = (e) => {
        e.preventDefault();
        const patientId = e.target.patientId.value;
        if (!patientId) {
            toast.warn("Please enter a Patient ID or Room #.");
            return;
        }
        toast.info(`Patient  checked out. ICU set to MAINTENANCE.`);
        e.target.reset();
    };

    return (
        <div className={styles.dashboard}>
            <section className="p-4 bg-slate-800 text-gray-100 rounded-xl mb-6">
                <h2 className="text-2xl font-semibold mb-2">💼 Receptionist Journey</h2>
                <ul className="list-disc ml-6 space-y-1">
                    <li>Login → Access Reception Panel</li>
                    <li>View ICU bed availability in real time</li>
                    <li>Create and submit new ICU reservation requests</li>
                    <li>Confirm patient check-ins and check-outs</li>
                    <li>Receive ambulance arrival notifications</li>
                    <li>Keep all data synced with the system automatically</li>
                </ul>
            </section>
            <header className={styles.header}>
                <h1>Receptionist Dashboard</h1>
                <p>Manage patient arrivals, departures, and ambulance coordination.</p>
            </header>
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
                                    <span className={`${styles.statusBadge} `}>EN ROUTE</span>
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
            <div className={styles.grid}>
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

export default ReceptionistPanel;
