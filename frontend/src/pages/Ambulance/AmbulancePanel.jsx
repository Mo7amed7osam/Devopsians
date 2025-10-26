import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import styles from './Ambulance.module.css';
import Button from '../../components/common/Button';
import { fetchActiveAmbulances } from '../../utils/api';

const AmbulancePanel = () => {
    const [ambulances, setAmbulances] = useState([]);
    const [loading, setLoading] = useState(true);
    const myAmbulanceId = 'amb-01';
    const [myStatus, setMyStatus] = useState('EN_ROUTE');

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const ambResponse = await fetchActiveAmbulances();
                setAmbulances(ambResponse.data);
                const myAmb = ambResponse.data.find(a => a.id === myAmbulanceId);
                if (myAmb) setMyStatus(myAmb.status);
            } catch (err) {
                toast.error("Failed to fetch ambulance data.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleStatusUpdate = (newStatus) => {
        toast.success(`Your status has been updated to ${newStatus}.`);
        setMyStatus(newStatus);
        setAmbulances(prev => 
            prev.map(amb => 
                amb.id === myAmbulanceId ? { ...amb, status: newStatus } : amb
            )
        );
    };

    const myAmbulance = ambulances.find(a => a.id === myAmbulanceId);

    return (
        <div className={styles.dashboard}>
            <section className="p-4 bg-slate-800 text-gray-100 rounded-xl mb-6">
                <h2 className="text-2xl font-semibold mb-2">🚑 Ambulance Journey</h2>
                <ul className="list-disc ml-6 space-y-1">
                    <li>Login → Access Ambulance Panel (mobile view)</li>
                    <li>View assigned trips linked to ICU reservations</li>
                    <li>Mark status: "En Route" or "Arrived"</li>
                    <li>Send live GPS updates to the hospital dashboard</li>
                    <li>Mark trip as completed after patient handoff</li>
                </ul>
            </section>
            <header className={styles.header}>
                <h1>Ambulance Crew Dashboard</h1>
                <p>Update your status and view active transports.</p>
            </header>
            <section className={styles.formCard} style={{ marginBottom: '30px' }}>
                <h3>My Status (Ambulance {myAmbulanceId})</h3>
                {myAmbulance ? (
                    <div>
                        <p><strong>Current Patient:</strong> {myAmbulance.patientName}</p>
                        <p><strong>Status:</strong> {myStatus}</p>
                    </div>
                ) : <p>Loading your details...</p>}
                <div className={styles.grid} style={{ marginTop: '20px' }}>
                    <Button 
                        variant="success" 
                        onClick={() => handleStatusUpdate('EN_ROUTE')}
                        disabled={myStatus === 'EN_ROUTE'}
                    >
                        Mark EN_ROUTE (Picking up)
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={() => handleStatusUpdate('ARRIVED_HOSPITAL')}
                        disabled={myStatus === 'ARRIVED_HOSPITAL'}
                    >
                        Mark ARRIVED AT HOSPITAL
                    </Button>
                    <Button 
                        variant="secondary" 
                        onClick={() => handleStatusUpdate('AVAILABLE')}
                        disabled={myStatus === 'AVAILABLE'}
                    >
                        Mark AVAILABLE (No Patient)
                    </Button>
                </div>
            </section>
            <section className={styles.statusPanel}>
                <h3>All Active Ambulances</h3>
                {loading ? (
                    <div className={styles.placeholder}>Loading...</div>
                ) : (
                    <div className={styles.ambulanceList}>
                        {ambulances.length === 0 ? (
                            <p className={styles.noAmbulance}>No ambulances currently active.</p>
                        ) : (
                            ambulances.map(amb => (
                                <div key={amb.id} className={styles.ambulanceItem}>
                                    <span className={`${styles.statusBadge} ${styles['status' + amb.status.toUpperCase()] || styles.statusEnRoute}`}>
                                        {amb.status.replace('_', ' ')}
                                    </span>
                                    <div className={styles.ambulanceInfo}>
                                        <strong>{amb.patientName}</strong> (Driver: {amb.driver})
                                    </div>
                                    <div className={styles.ambulanceEta}>
                                        {amb.status === 'EN_ROUTE' ? `ETA: ${amb.etaMinutes} mins` : 'Status: IDLE'}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </section>
        </div>
    );
};

export default AmbulancePanel;