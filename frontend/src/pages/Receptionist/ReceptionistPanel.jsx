import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import styles from './ReceptionistDashboard.module.css';
import Button from '../../components/common/Button';
import { getICURequests, fetchActiveAmbulances, checkInPatient, checkOutPatient } from '../../utils/api';
import socket from '../../utils/socket';

const ReceptionistPanel = () => {
    const [reservations, setReservations] = useState([]);
    const [ambulances, setAmbulances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        loadData();

        // Listen for real-time ambulance updates
        if (socket) {
            socket.on('ambulanceStatusUpdate', (data) => {
                setAmbulances(prev => 
                    prev.map(amb => 
                        amb._id === data.ambulanceId 
                            ? { ...amb, status: data.status, currentLocation: data.location, eta: data.eta }
                            : amb
                    ).filter(amb => amb.status === 'EN_ROUTE') // Keep only EN_ROUTE ambulances
                );
            });

            socket.on('ambulanceAssigned', (data) => {
                toast.info(`🚑 Ambulance assigned to ${data.destination}`);
                loadData(); // Reload to get new assignments
            });

            // Listen for ambulance approvals
            socket.on('ambulanceApprovedPickup', (data) => {
                toast.success(`✅ Ambulance crew approved pickup for ${data.patientName}!`);
                loadData(); // Reload to show updated status
            });

            // Listen for pickup rejections
            socket.on('pickupRejectedNotification', (data) => {
                toast.warn(`⚠️ Ambulance rejected pickup for ${data.patientName}. Reason: ${data.reason}`);
                loadData();
            });
        }

        return () => {
            if (socket) {
                socket.off('ambulanceStatusUpdate');
                socket.off('ambulanceAssigned');
                socket.off('ambulanceApprovedPickup');
                socket.off('pickupRejectedNotification');
            }
        };
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [resResponse, ambResponse] = await Promise.all([
                getICURequests(),
                fetchActiveAmbulances()
            ]);
            
            // Handle ICU requests data
            const icuRequests = resResponse.data?.requests || resResponse.data?.data || [];
            setReservations(icuRequests);
            
            // Handle ambulance data - filter for en route ambulances
            const ambulanceData = ambResponse.data?.ambulances || ambResponse.data?.data || [];
            const enRouteAmbulances = ambulanceData.filter(a => a.status === 'EN_ROUTE');
            setAmbulances(enRouteAmbulances);
        } catch (err) {
            toast.error("Failed to fetch dashboard data.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async (icuId, patientId, icuRoom) => {
        try {
            setActionLoading(icuId);
            console.log('🔵 Check-in attempt:', { icuId, patientId, icuRoom });
            await checkInPatient({ icuId, patientId });
            toast.success(`Patient checked in to ICU Room ${icuRoom}`);
            setReservations(prev => prev.filter(res => res._id !== icuId));
        } catch (err) {
            console.error('Check-in error:', err);
            console.error('Error response:', err.response?.data);
            toast.error(err.response?.data?.message || 'Failed to check in patient');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCheckOut = async (e) => {
        e.preventDefault();
        const patientIdOrRoom = e.target.patientId.value.trim();
        
        if (!patientIdOrRoom) {
            toast.warn("Please enter a Patient ID or Room #.");
            return;
        }

        try {
            setActionLoading('checkout');
            
            // Try to find ICU by patient ID first, or by room number
            const icuToCheckout = reservations.find(res => 
                res.reservedBy?._id === patientIdOrRoom || 
                res.reservedBy === patientIdOrRoom ||
                res.room === patientIdOrRoom
            );

            if (!icuToCheckout) {
                toast.error(`No active ICU found for: ${patientIdOrRoom}`);
                setActionLoading(null);
                return;
            }

            await checkOutPatient({ 
                icuId: icuToCheckout._id, 
                patientId: icuToCheckout.reservedBy?._id || icuToCheckout.reservedBy 
            });
            
            toast.success(`Patient discharged. ICU Room ${icuToCheckout.room} is now Available`);
            e.target.reset();
            
            // Refresh data
            await loadData();
        } catch (err) {
            console.error('Check-out error:', err);
            toast.error(err.response?.data?.message || 'Failed to check out patient');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className={styles.dashboard}>
            <header className={styles.header}>
                <h1>🏥 Receptionist Dashboard</h1>
                <p>Manage patient arrivals, departures, and real-time ambulance coordination.</p>
            </header>
            <section className={styles.statusPanel}>
                <h3>🚑 Live Ambulance Tracking ({ambulances.length} En Route)</h3>
                {loading ? (
                    <div className={styles.placeholder}>Loading...</div>
                ) : (
                    <div className={styles.ambulanceList}>
                        {ambulances.length === 0 ? (
                            <p className={styles.noAmbulance}>No ambulances currently en route.</p>
                        ) : (
                            ambulances.map(amb => {
                                const hasLocation = amb.currentLocation && amb.currentLocation.coordinates;
                                return (
                                    <div key={amb._id} className={styles.ambulanceItem}>
                                        <span className={`${styles.statusBadge} ${styles.statusEnRoute}`}>
                                            🚨 EN ROUTE
                                        </span>
                                        <div className={styles.ambulanceInfo}>
                                            <strong>{amb.firstName} {amb.lastName}</strong> ({amb.userName})
                                            {amb.assignedPatient && (
                                                <div><small>Patient: {
                                                    typeof amb.assignedPatient === 'object'
                                                        ? `${amb.assignedPatient.firstName} ${amb.assignedPatient.lastName}`
                                                        : amb.assignedPatient
                                                }</small></div>
                                            )}
                                        </div>
                                        <div className={styles.ambulanceEta}>
                                            {amb.destination && (
                                                <div><strong>📍 {amb.destination}</strong></div>
                                            )}
                                            {amb.eta ? (
                                                <div style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
                                                    ⏱️ ETA: {amb.eta} min
                                                </div>
                                            ) : (
                                                <div>⏱️ ETA: Calculating...</div>
                                            )}
                                            {hasLocation && (
                                                <div style={{ fontSize: '0.85em', color: '#4caf50' }}>
                                                    � Location Active
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
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
                            {reservations.map(res => {
                                const patientInfo = res.reservedBy;
                                const patientName = patientInfo?.firstName && patientInfo?.lastName 
                                    ? `${patientInfo.firstName} ${patientInfo.lastName}`
                                    : `Patient ID: ${patientInfo?._id || patientInfo || 'Unknown'}`;
                                const patientId = patientInfo?._id || patientInfo;
                                const patientStatus = patientInfo?.patientStatus || 'RESERVED';
                                
                                return (
                                    <div key={res._id} className={styles.reservationItem}>
                                        <div className={styles.patientInfo}>
                                            <span className={styles.patientName}>
                                                {patientName}
                                                {patientStatus === 'ARRIVED' && (
                                                    <span style={{ 
                                                        marginLeft: '10px', 
                                                        padding: '3px 8px', 
                                                        backgroundColor: '#4caf50', 
                                                        color: 'white', 
                                                        borderRadius: '4px',
                                                        fontSize: '0.85em'
                                                    }}>
                                                        🏥 ARRIVED
                                                    </span>
                                                )}
                                                {patientStatus === 'AWAITING_PICKUP' && (
                                                    <span style={{ 
                                                        marginLeft: '10px', 
                                                        padding: '3px 8px', 
                                                        backgroundColor: '#ff9800', 
                                                        color: 'white', 
                                                        borderRadius: '4px',
                                                        fontSize: '0.85em'
                                                    }}>
                                                        🚑 AWAITING PICKUP
                                                    </span>
                                                )}
                                                {patientStatus === 'IN_TRANSIT' && (
                                                    <span style={{ 
                                                        marginLeft: '10px', 
                                                        padding: '3px 8px', 
                                                        backgroundColor: '#2196f3', 
                                                        color: 'white', 
                                                        borderRadius: '4px',
                                                        fontSize: '0.85em'
                                                    }}>
                                                        🚐 IN TRANSIT
                                                    </span>
                                                )}
                                                {patientStatus === 'RESERVED' && !patientInfo?.needsPickup && (
                                                    <span style={{ 
                                                        marginLeft: '10px', 
                                                        padding: '3px 8px', 
                                                        backgroundColor: '#9c27b0', 
                                                        color: 'white', 
                                                        borderRadius: '4px',
                                                        fontSize: '0.85em'
                                                    }}>
                                                        🚶 COMING DIRECTLY
                                                    </span>
                                                )}
                                            </span>
                                            <span className={styles.roomInfo}>
                                                Room: {res.room} ({res.specialization})
                                            </span>
                                            <span className={styles.hospitalInfo}>
                                                Hospital: {res.hospital?.name || 'N/A'}
                                            </span>
                                            {patientInfo?.email && (
                                                <span className={styles.patientEmail}>
                                                    Email: {patientInfo.email}
                                                </span>
                                            )}
                                            {patientInfo?.phone && (
                                                <span className={styles.patientPhone}>
                                                    Phone: {patientInfo.phone}
                                                </span>
                                            )}
                                            {patientInfo?.needsPickup && (
                                                <span className={styles.pickupInfo} style={{ color: '#ff9800', fontWeight: 'bold' }}>
                                                    🚑 Pickup Location: {patientInfo.pickupLocation || 'Not specified'}
                                                </span>
                                            )}
                                            {patientInfo?.assignedAmbulance && (
                                                <span className={styles.ambulanceInfo} style={{ color: '#2196f3' }}>
                                                    Ambulance: {patientInfo.assignedAmbulance.firstName} {patientInfo.assignedAmbulance.lastName} ({patientInfo.assignedAmbulance.status})
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                                            {/* Allow check-in for:
                                                1. RESERVED status (patient coming on their own or ambulance not yet requested)
                                                2. ARRIVED status (ambulance delivered patient)
                                            */}
                                            {(patientStatus === 'RESERVED' || patientStatus === 'ARRIVED') && (
                                                <Button 
                                                    variant="success" 
                                                    className={styles.actionBtn}
                                                    onClick={() => handleCheckIn(res._id, patientId, res.room)}
                                                    disabled={actionLoading === res._id}
                                                >
                                                    {actionLoading === res._id ? 'Checking in...' : '✅ Check-In Patient'}
                                                </Button>
                                            )}
                                            {(patientStatus === 'AWAITING_PICKUP' || patientStatus === 'IN_TRANSIT') && patientInfo?.needsPickup && (
                                                <div style={{ 
                                                    padding: '8px', 
                                                    backgroundColor: '#fff3cd', 
                                                    borderRadius: '4px',
                                                    fontSize: '0.9em',
                                                    textAlign: 'center'
                                                }}>
                                                    ⏳ Waiting for ambulance...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
                <section className={styles.formCard}>
                    <h3>Patient Check-Out</h3>
                    <p>Discharge a patient and mark their ICU as "Available".</p>
                    <form onSubmit={handleCheckOut} className={styles.checkoutForm}>
                        <input 
                            type="text" 
                            name="patientId"
                            placeholder="Enter Patient ID or Room #" 
                            className={styles.inputField}
                            disabled={actionLoading === 'checkout'}
                        />
                        <Button 
                            type="submit" 
                            variant="secondary"
                            disabled={actionLoading === 'checkout'}
                        >
                            {actionLoading === 'checkout' ? 'Processing...' : 'Check-Out Patient'}
                        </Button>
                    </form>
                </section>
            </div>
        </div>
    );
};

export default ReceptionistPanel;
