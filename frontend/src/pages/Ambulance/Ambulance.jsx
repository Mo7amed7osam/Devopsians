// src/pages/AmbulanceDashboard.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import styles from './Ambulance.module.css'; 
import Button from '../../components/common/Button';
import { getAllAmbulances, updateAmbulanceStatus } from '../../utils/api';
import { getUserId } from '../../utils/cookieUtils';
import socket from '../../utils/socket';

const AmbulanceDashboard = () => {
    const [ambulances, setAmbulances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [myAmbulance, setMyAmbulance] = useState(null);
    const myAmbulanceId = getUserId(); // Get current logged-in ambulance user ID

    useEffect(() => {
        loadData();

        // Listen for real-time ambulance status updates
        if (socket) {
            socket.on('ambulanceStatusUpdate', (data) => {
                setAmbulances(prev => 
                    prev.map(amb => 
                        amb._id === data.ambulanceId 
                            ? { ...amb, status: data.status, currentLocation: data.location, eta: data.eta }
                            : amb
                    )
                );

                // Update my ambulance if it's me
                if (data.ambulanceId === myAmbulanceId) {
                    setMyAmbulance(prev => ({
                        ...prev,
                        status: data.status,
                        currentLocation: data.location,
                        eta: data.eta
                    }));
                }
            });
        }

        return () => {
            if (socket) {
                socket.off('ambulanceStatusUpdate');
            }
        };
    }, [myAmbulanceId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const ambResponse = await getAllAmbulances();
            const ambulanceData = ambResponse.data?.ambulances || [];
            setAmbulances(ambulanceData);
            
            // Find my ambulance data
            const myAmb = ambulanceData.find(a => a._id === myAmbulanceId);
            if (myAmb) {
                setMyAmbulance(myAmb);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to fetch ambulance data.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        if (!myAmbulanceId) {
            toast.error('User ID not found. Please log in again.');
            return;
        }

        try {
            await updateAmbulanceStatus(myAmbulanceId, { status: newStatus });
            toast.success(`Your status has been updated to ${newStatus.replace('_', ' ')}.`);
            
            // Update local state
            setMyAmbulance(prev => ({ ...prev, status: newStatus }));
            setAmbulances(prev => 
                prev.map(amb => 
                    amb._id === myAmbulanceId ? { ...amb, status: newStatus } : amb
                )
            );
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update status.');
            console.error(err);
        }
    };

    return (
        <div className={styles.dashboard}>
            <header className={styles.header}>
                <h1>Ambulance Crew Dashboard</h1>
                <p>Update your status and view active transports.</p>
            </header>

            {/* Section to manage THIS ambulance's status */}
            <section className={styles.formCard} style={{ marginBottom: '30px' }}>
                <h3>My Status (Ambulance ID: {myAmbulanceId?.substring(0, 8) || 'N/A'})</h3>
                {myAmbulance ? (
                    <div>
                        <p><strong>Name:</strong> {myAmbulance.firstName} {myAmbulance.lastName}</p>
                        <p><strong>Username:</strong> {myAmbulance.userName}</p>
                        <p><strong>Current Status:</strong> <span className={styles.statusBadge}>{myAmbulance.status?.replace('_', ' ')}</span></p>
                        {myAmbulance.assignedPatient && (
                            <p><strong>Assigned Patient ID:</strong> {myAmbulance.assignedPatient}</p>
                        )}
                        {myAmbulance.destination && (
                            <p><strong>Destination:</strong> {myAmbulance.destination}</p>
                        )}
                        {myAmbulance.eta && (
                            <p><strong>ETA:</strong> {myAmbulance.eta} minutes</p>
                        )}
                    </div>
                ) : <p>Loading your details...</p>}
                
                <div className={styles.grid} style={{ marginTop: '20px' }}>
                    <Button 
                        variant="success" 
                        onClick={() => handleStatusUpdate('EN_ROUTE')}
                        disabled={myAmbulance?.status === 'EN_ROUTE' || loading}
                    >
                        Mark EN ROUTE
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={() => handleStatusUpdate('ARRIVED_HOSPITAL')}
                        disabled={myAmbulance?.status === 'ARRIVED_HOSPITAL' || loading}
                    >
                        Mark ARRIVED
                    </Button>
                     <Button 
                        variant="secondary" 
                        onClick={() => handleStatusUpdate('AVAILABLE')}
                        disabled={myAmbulance?.status === 'AVAILABLE' || loading}
                    >
                        Mark AVAILABLE
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
                                <div key={amb._id} className={styles.ambulanceItem}>
                                    <span className={`${styles.statusBadge} ${styles['status' + (amb.status || '').replace('_', '')] || ''}`}>
                                        {amb.status?.replace('_', ' ') || 'UNKNOWN'}
                                    </span>
                                    <div className={styles.ambulanceInfo}>
                                        <strong>{amb.firstName} {amb.lastName}</strong> ({amb.userName})
                                    </div>
                                    <div className={styles.ambulanceEta}>
                                        {amb.status === 'EN_ROUTE' && amb.eta ? `ETA: ${amb.eta} mins` : 
                                         amb.status === 'AVAILABLE' ? 'Ready for assignment' : 
                                         amb.status === 'ARRIVED_HOSPITAL' ? 'At hospital' : 
                                         'Status: ' + (amb.status || 'N/A')}
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