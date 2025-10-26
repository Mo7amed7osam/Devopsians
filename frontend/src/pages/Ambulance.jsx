// src/pages/AmbulanceDashboard.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
// Using the specific styles for this dashboard
import styles from './Ambulance.module.css'; 
import Button from '../components/Button';
import { fetchActiveAmbulances } from '../utils/api'; // Assuming an API function

const AmbulanceDashboard = () => {
    const [ambulances, setAmbulances] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // This ID would come from auth context in a real app
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
        // Mock API call
        toast.success(`Your status has been updated to ${newStatus}.`);
        setMyStatus(newStatus);
        
        // Update the list optimistically
        setAmbulances(prev => 
            prev.map(amb => 
                amb.id === myAmbulanceId ? { ...amb, status: newStatus } : amb
            )
        );
    };

    const myAmbulance = ambulances.find(a => a.id === myAmbulanceId);

    return (
        <div className={styles.dashboard}>
            <header className={styles.header}>
                <h1>Ambulance Crew Dashboard</h1>
                <p>Update your status and view active transports.</p>
            </header>

            {/* Section to manage THIS ambulance's status */}
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

            {/* Section to view all active ambulances */}
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
                                    {/* Use status directly, assuming CSS class matches (e.g., statusENROUTE) */}
                                    <span className={`${styles.statusBadge} ${styles[`status${amb.status.toUpperCase()}`] || styles.statusEnRoute}`}>
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

export default AmbulanceDashboard;