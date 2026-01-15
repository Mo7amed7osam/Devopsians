import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import styles from './ReceptionistDashboard.module.css';
import Button from '../../components/common/Button';
import { getICURequests, getCheckedInPatients, fetchActiveAmbulances, checkInPatient, checkOutPatient, calculateFeeReceptionist, markFeesPaid, showUserDetails } from '../../utils/api';
import useLiveLocations from '../../utils/useLiveLocations';
import socket from '../../utils/socket';
import { getUserData } from '../../utils/cookieUtils';

const ReceptionistPanel = () => {
    const [reservations, setReservations] = useState([]);
    const [checkedInPatients, setCheckedInPatients] = useState([]);
    const [ambulances, setAmbulances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [patientFees, setPatientFees] = useState({});
    const [assignedHospitalId, setAssignedHospitalId] = useState(null);
    const [assignedHospitalName, setAssignedHospitalName] = useState(null);
    // Live polling of all user locations (including ambulances) every 5s
    const { locations: liveLocations } = useLiveLocations(true, 5000);

    useEffect(() => {
        const init = async () => {
            const { hospitalId, hospitalName } = await loadAssignedHospital();
            await loadData(hospitalId, hospitalName);
        };
        init();

            // Listen for real-time ambulance updates
            if (socket) {
            socket.on('ambulanceStatusUpdate', (data) => {
                console.log('[Socket] ambulanceStatusUpdate:', data);
                setAmbulances(prev => 
                    prev.map(amb => 
                        amb._id === data.ambulanceId 
                            ? { ...amb, status: data.status, currentLocation: data.location, eta: data.eta }
                            : amb
                    ).filter(amb => amb.status === 'EN_ROUTE') // Keep only EN_ROUTE ambulances
                );
            });

            socket.on('ambulanceAssigned', (data) => {
                console.log('[Socket] ambulanceAssigned:', data);
                toast.info(`Ambulance assigned to ${data.destination}`);
                loadData(); // Reload to get new assignments
            });

            // Listen for new pickup requests from patients
            socket.on('ambulancePickupRequest', (data) => {
                console.log('[Socket] ambulancePickupRequest:', data);
                toast.info(`New ambulance pickup request from ${data.patientName || 'patient'}`, {
                    autoClose: 5000
                });
                loadData(); // Reload to show new request
            });

            // Listen for when an ambulance accepts a pickup
            socket.on('ambulanceAccepted', (data) => {
                console.log('[Socket] ambulanceAccepted:', data);
                toast.success(`Ambulance accepted pickup - heading to patient`);
                loadData();
            });

            // Listen for ambulance approvals
            socket.on('ambulanceApprovedPickup', (data) => {
                console.log('[Socket] ambulanceApprovedPickup:', data);
                toast.success(`Ambulance crew approved pickup for ${data.patientName}.`);
                loadData(); // Reload to show updated status
            });

            // Listen for pickup rejections
            socket.on('pickupRejectedNotification', (data) => {
                console.log('[Socket] pickupRejectedNotification:', data);
                toast.warn(`Ambulance rejected pickup for ${data.patientName}. Reason: ${data.reason}`);
                loadData();
            });

            // Listen for real-time ICU events
            socket.on('icuReserved', (data) => {
                console.log('[Socket] icuReserved:', data);
                toast.info(`New ICU reservation: ${data.hospitalName} - Room ${data.room}`);
                loadData(); // Reload to show new reservation
            });

            socket.on('icuReservationCancelled', (data) => {
                console.log('[Socket] icuReservationCancelled:', data);
                toast.info('ICU reservation cancelled');
                loadData(); // Reload to update list
            });

            socket.on('icuCheckOut', (data) => {
                console.log('[Socket] icuCheckOut:', data);
                toast.success('Patient checked out');
                loadData(); // Reload to update list
            });

            // Listen for patient arrival
            socket.on('patientArrived', (data) => {
                console.log('[Socket] patientArrived:', data);
                toast.success(`Patient ${data.patientName || ''} has arrived at the hospital.`);
                loadData();
            });
        }

        return () => {
            if (socket) {
                socket.off('ambulanceStatusUpdate');
                socket.off('ambulanceAssigned');
                socket.off('ambulancePickupRequest');
                socket.off('ambulanceAccepted');
                socket.off('ambulanceApprovedPickup');
                socket.off('pickupRejectedNotification');
                socket.off('icuReserved');
                socket.off('icuReservationCancelled');
                socket.off('icuCheckOut');
                socket.off('patientArrived');
            }
        };
    }, []);

    const loadAssignedHospital = async () => {
        let hospitalId = null;
        let hospitalName = null;
        try {
            const userData = getUserData();
            if (userData?.hospitalName) {
                hospitalName = userData.hospitalName;
                setAssignedHospitalName(userData.hospitalName);
            }
            if (!userData?.id) {
                return { hospitalId, hospitalName };
            }
            const response = await showUserDetails(userData.id);
            const hospital = response?.data?.user?.assignedHospital;
            if (hospital) {
                hospitalId = hospital._id || hospital.id || hospital;
                setAssignedHospitalId(hospitalId);
            }
        } catch (err) {
            console.warn('Failed to load assigned hospital for receptionist.', err);
        }
        return { hospitalId, hospitalName };
    };

    const filterByAssignedHospital = (items = [], hospitalIdOverride, hospitalNameOverride) => {
        const effectiveHospitalId = hospitalIdOverride ?? assignedHospitalId;
        const effectiveHospitalName = hospitalNameOverride ?? assignedHospitalName;
        if (!effectiveHospitalId && !effectiveHospitalName) return items;
        return items.filter((item) => {
            const hospital = item?.hospital;
            const hospitalId = hospital?._id || hospital?.id || hospital;
            if (effectiveHospitalId && hospitalId) {
                return String(hospitalId) === String(effectiveHospitalId);
            }
            if (effectiveHospitalName && hospital?.name) {
                return hospital.name.toLowerCase() === effectiveHospitalName.toLowerCase();
            }
            return false;
        });
    };

    const loadData = async (hospitalIdOverride, hospitalNameOverride) => {
        setLoading(true);
        try {
            const [resResponse, checkedInResponse, ambResponse] = await Promise.all([
                getICURequests(),
                getCheckedInPatients(),
                fetchActiveAmbulances()
            ]);
            
            // Handle ICU requests data
            const icuRequests = resResponse.data?.requests || resResponse.data?.data || [];
            setReservations(filterByAssignedHospital(icuRequests, hospitalIdOverride, hospitalNameOverride));
            
            // Handle checked-in patients data
            const checkedIn = checkedInResponse.data?.patients || checkedInResponse.data?.data || [];
            setCheckedInPatients(filterByAssignedHospital(checkedIn, hospitalIdOverride, hospitalNameOverride));
            
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

    // Fallback polling update for ambulances (merge with socket updates)
    useEffect(() => {
        if (!liveLocations || liveLocations.length === 0) return;
        // Filter only ambulance users that are en route
        const polledAmbulances = liveLocations
            .filter(u => u.role === 'Ambulance' && u.status === 'EN_ROUTE' && Array.isArray(u.coordinates) && u.coordinates.length === 2)
            .map(u => ({
                _id: u.id,
                firstName: (u.name || '').split(' ')[0] || 'Ambulance',
                lastName: (u.name || '').split(' ').slice(1).join(' '),
                userName: u.name,
                status: 'EN_ROUTE',
                currentLocation: { type: 'Point', coordinates: u.coordinates },
                eta: u.eta,
                destination: u.destination,
                assignedPatient: null,
            }));

        // Merge with existing ambulances, preferring socket-updated entries
        setAmbulances(prev => {
            const byId = new Map(prev.map(a => [a._id, a]));
            polledAmbulances.forEach(p => {
                if (!byId.has(p._id)) {
                    byId.set(p._id, p);
                } else {
                    // Merge location & eta updates, keep other fields
                    const existing = byId.get(p._id);
                    byId.set(p._id, { ...existing, currentLocation: p.currentLocation || existing.currentLocation, eta: p.eta || existing.eta });
                }
            });
            // Only keep EN_ROUTE for display
            return Array.from(byId.values()).filter(a => a.status === 'EN_ROUTE');
        });
    }, [liveLocations]);

    const handleCheckIn = async (icuId, patientId, icuRoom) => {
        try {
            setActionLoading(icuId);
            console.log('Check-in attempt:', { icuId, patientId, icuRoom });
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

    const loadPatientFee = async (patientId) => {
        try {
            const response = await calculateFeeReceptionist({ patientId });
            const feeData = response.data?.data;
            setPatientFees(prev => ({
                ...prev,
                [patientId]: feeData
            }));
        } catch (err) {
            console.error('Error loading fee:', err);
        }
    };

    const handleMarkPaid = async (patientId) => {
        try {
            setActionLoading(`pay-${patientId}`);
            await markFeesPaid({ patientId });
            toast.success('Payment confirmed');
            
            // Update local state
            setPatientFees(prev => ({
                ...prev,
                [patientId]: { ...prev[patientId], feesPaid: true }
            }));
            
            // Reload data
            await loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to mark payment');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCheckOut = async (icuId, patientId) => {
        if (!icuId || !patientId) {
            toast.error('Invalid checkout request: Missing ICU ID or Patient ID');
            return;
        }

        // Check if fees are loaded
        if (!patientFees[patientId]) {
            await loadPatientFee(patientId);
        }

        const feeInfo = patientFees[patientId];
        
        // Check payment status
        if (feeInfo && !feeInfo.feesPaid) {
            toast.error('Cannot check out: Fees have not been paid. Please process payment first.');
            return;
        }

        if (!window.confirm(`Are you sure you want to check out this patient?`)) {
            return;
        }

        try {
            setActionLoading(icuId);
            
            const response = await checkOutPatient({ icuId, patientId });
            
            toast.success(`Patient discharged successfully`);
            
            // Remove from local state immediately
            setCheckedInPatients(prev => prev.filter(icu => icu._id !== icuId));
            
            // Refresh data after a short delay
            setTimeout(() => {
                loadData();
            }, 500);
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to check out patient';
            toast.error(`${errorMessage}`);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className={styles.dashboard}>
            <header className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                        <h1>Receptionist Dashboard</h1>
                        <p>Manage patient arrivals, departures, and real-time ambulance coordination.</p>
                    </div>
                    <div style={{ 
                        padding: '15px 25px', 
                        backgroundColor: 'var(--color-surface-2)', 
                        borderRadius: '10px',
                        border: '2px solid var(--color-primary)',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <div style={{ fontSize: '0.9em', color: 'var(--color-ink-muted)', fontWeight: '500' }}>
                            {getUserData()?.hospitalName || 'Loading...'}
                        </div>
                    </div>
                </div>
            </header>
            <section className={styles.statusPanel}>
                <h3>Live Ambulance Tracking ({ambulances.length} En Route)</h3>
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
                                            EN ROUTE
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
                                                <div><strong>{amb.destination}</strong></div>
                                            )}
                                            {amb.eta ? (
                                                <div style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>
                                                    ⏱️ ETA: {amb.eta} min
                                                </div>
                                            ) : (
                                                <div>⏱️ ETA: Calculating...</div>
                                            )}
                                            {hasLocation && (
                                                <div style={{ fontSize: '0.85em', color: 'var(--color-success)' }}>
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
                                                        backgroundColor: 'var(--color-success)', 
                                                        color: 'white', 
                                                        borderRadius: '4px',
                                                        fontSize: '0.85em'
                                                    }}>
                                                        ARRIVED
                                                    </span>
                                                )}
                                                {patientStatus === 'AWAITING_PICKUP' && (
                                                    <span style={{ 
                                                        marginLeft: '10px', 
                                                        padding: '3px 8px', 
                                                        backgroundColor: 'var(--color-accent)', 
                                                        color: 'white', 
                                                        borderRadius: '4px',
                                                        fontSize: '0.85em'
                                                    }}>
                                                        AWAITING PICKUP
                                                    </span>
                                                )}
                                                {patientStatus === 'IN_TRANSIT' && (
                                                    <span style={{ 
                                                        marginLeft: '10px', 
                                                        padding: '3px 8px', 
                                                        backgroundColor: 'var(--color-info)', 
                                                        color: 'white', 
                                                        borderRadius: '4px',
                                                        fontSize: '0.85em'
                                                    }}>
                                                        IN TRANSIT
                                                    </span>
                                                )}
                                                {patientStatus === 'RESERVED' && !patientInfo?.needsPickup && (
                                                    <span style={{ 
                                                        marginLeft: '10px', 
                                                        padding: '3px 8px', 
                                                        backgroundColor: 'var(--color-primary)', 
                                                        color: 'white', 
                                                        borderRadius: '4px',
                                                        fontSize: '0.85em'
                                                    }}>
                                                        COMING DIRECTLY
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
                                                <span className={styles.pickupInfo} style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>
                                                    Pickup Location: {patientInfo.pickupLocation || 'Not specified'}
                                                </span>
                                            )}
                                            {patientInfo?.assignedAmbulance && (
                                                <span className={styles.ambulanceInfo} style={{ color: 'var(--color-info)' }}>
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
                                                    {actionLoading === res._id ? 'Checking in...' : 'Check-In Patient'}
                                                </Button>
                                            )}
                                            {(patientStatus === 'AWAITING_PICKUP' || patientStatus === 'IN_TRANSIT') && patientInfo?.needsPickup && (
                                                <div style={{ 
                                                    padding: '8px', 
                                                    backgroundColor: 'var(--color-accent-soft)', 
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
                    <h3>Patient Check-Out ({checkedInPatients.length} Checked In)</h3>
                    {loading ? (
                        <div className={styles.placeholder}>Loading checked-in patients...</div>
                    ) : checkedInPatients.length === 0 ? (
                        <div className={styles.placeholder}>No patients currently checked in.</div>
                    ) : (
                        <div className={styles.reservationList}>
                            {checkedInPatients.map(icu => {
                                const patientInfo = icu.reservedBy;
                                const patientName = patientInfo?.firstName && patientInfo?.lastName 
                                    ? `${patientInfo.firstName} ${patientInfo.lastName}`
                                    : `Patient ID: ${patientInfo?._id || patientInfo || 'Unknown'}`;
                                const patientId = patientInfo?._id || patientInfo;
                                const checkedInDate = icu.checkedInAt ? new Date(icu.checkedInAt).toLocaleString() : 'N/A';
                                const feeInfo = patientFees[patientId];
                                
                                // Load fee if not already loaded
                                if (!feeInfo && patientId) {
                                    loadPatientFee(patientId);
                                }
                                
                                return (
                                    <div key={icu._id} className={styles.reservationItem}>
                                        <div className={styles.patientInfo}>
                                            <span className={styles.patientName}>
                                                {patientName}
                                                <span style={{ 
                                                    marginLeft: '10px', 
                                                    padding: '3px 8px', 
                                                    backgroundColor: 'var(--color-success)', 
                                                    color: 'white', 
                                                    borderRadius: '4px',
                                                    fontSize: '0.85em'
                                                }}>
                                                    CHECKED IN
                                                </span>
                                            </span>
                                            <span className={styles.roomInfo}>
                                                Room: {icu.room} ({icu.specialization})
                                            </span>
                                            <span className={styles.hospitalInfo}>
                                                Hospital: {icu.hospital?.name || 'N/A'}
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
                                            <span className={styles.checkedInTime} style={{ color: 'var(--color-ink-subtle)', fontSize: '0.9em' }}>
                                                Checked in: {checkedInDate}
                                            </span>
                                            {feeInfo && (
                                                <div style={{ 
                                                    marginTop: '10px', 
                                                    padding: '10px', 
                                                    backgroundColor: 'var(--color-surface-2)',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--color-primary)'
                                                }}>
                                                    <div style={{ fontWeight: '600', color: 'var(--color-primary)', marginBottom: '5px' }}>
                                                        Total Fees: {feeInfo.totalFee} EGP
                                                    </div>
                                                    <div style={{ fontSize: '0.85em', color: 'var(--color-ink-subtle)' }}>
                                                        {feeInfo.daysStayed} day{feeInfo.daysStayed > 1 ? 's' : ''} × {feeInfo.dailyRate} EGP/day
                                                    </div>
                                                    {feeInfo.feesPaid === true ? (
                                                        <div style={{ 
                                                            marginTop: '5px',
                                                            padding: '5px 10px',
                                                            backgroundColor: 'var(--color-success)',
                                                            color: 'white',
                                                            borderRadius: '4px',
                                                            display: 'inline-block',
                                                            fontSize: '0.85em',
                                                            fontWeight: '600'
                                                        }}>
                                                            PAID
                                                        </div>
                                                    ) : (
                                                        <div style={{ 
                                                            marginTop: '5px',
                                                            padding: '5px 10px',
                                                            backgroundColor: 'var(--color-accent)',
                                                            color: 'white',
                                                            borderRadius: '4px',
                                                            display: 'inline-block',
                                                            fontSize: '0.85em',
                                                            fontWeight: '600'
                                                        }}>
                                                            ⏳ UNPAID
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {feeInfo && !feeInfo.feesPaid && (
                                                <Button 
                                                    variant="success" 
                                                    className={styles.actionBtn}
                                                    onClick={() => handleMarkPaid(patientId)}
                                                    disabled={actionLoading === `pay-${patientId}`}
                                                >
                                                    {actionLoading === `pay-${patientId}` ? 'Processing...' : 'Mark as Paid'}
                                                </Button>
                                            )}
                                            <Button 
                                                variant="danger" 
                                                className={styles.actionBtn}
                                                onClick={() => handleCheckOut(icu._id, patientId)}
                                                disabled={actionLoading === icu._id || (feeInfo && !feeInfo.feesPaid)}
                                            >
                                                {actionLoading === icu._id ? 'Checking out...' : 'Check-Out Patient'}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default ReceptionistPanel;
