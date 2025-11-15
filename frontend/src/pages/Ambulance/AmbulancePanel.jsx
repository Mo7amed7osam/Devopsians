import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import styles from './Ambulance.module.css';
import Button from '../../components/common/Button';
import { getAllAmbulances, updateAmbulanceStatus } from '../../utils/api';
import { getUserId, getToken } from '../../utils/cookieUtils';
import socket from '../../utils/socket';

const AmbulancePanel = () => {
    const [ambulances, setAmbulances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [myAmbulance, setMyAmbulance] = useState(null);
    const [pickupRequests, setPickupRequests] = useState([]); // All available pickup requests
    const [gpsTracking, setGpsTracking] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [distance, setDistance] = useState(null);
    const [directions, setDirections] = useState(null);
    const myAmbulanceId = getUserId();
    const gpsIntervalRef = useRef(null);
    const mockIntervalRef = useRef(null);

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

            // Listen for assignment events
            socket.on('ambulanceAssigned', (data) => {
                if (data.ambulanceId === myAmbulanceId) {
                    toast.info(`📍 New assignment: ${data.destination}`);
                    loadData(); // Reload to get updated assignment
                }
            });

            // Listen for pickup requests from patients
            socket.on('ambulancePickupRequest', (data) => {
                console.log('🔔 Received pickup request:', data);
                
                // Add to pickup requests list
                setPickupRequests(prev => {
                    // Check if request already exists
                    const exists = prev.find(req => req.patientId === data.patientId);
                    if (!exists) {
                        console.log('✅ Adding new pickup request to list');
                        toast.info(`🚑 New pickup request from ${data.patientName} to ${data.hospitalName}!`, {
                            autoClose: 8000,
                            position: "top-right"
                        });
                        return [...prev, data];
                    }
                    console.log('⚠️ Request already exists in list');
                    return prev;
                });
            });

            // Listen for when a pickup request is taken by another ambulance
            socket.on('pickupRequestTaken', (data) => {
                setPickupRequests(prev => prev.filter(req => req.patientId !== data.patientId));
                if (data.ambulanceId !== myAmbulanceId) {
                    toast.info(`Pickup request for patient was accepted by another ambulance`, {
                        autoClose: 5000
                    });
                }
            });

            // Listen for successful acceptance
            socket.on('ambulanceAccepted', (data) => {
                if (data.ambulanceId === myAmbulanceId) {
                    toast.success(`✅ Pickup accepted! You're now en route to pick up the patient.`, {
                        autoClose: 8000,
                        position: "top-center"
                    });
                    loadData();
                }
            });
        }

        return () => {
            if (socket) {
                socket.off('ambulanceStatusUpdate');
                socket.off('ambulanceAssigned');
                socket.off('ambulancePickupRequest');
                socket.off('pickupRequestTaken');
                socket.off('ambulanceAccepted');
            }
            // Clear GPS tracking on unmount
            if (gpsIntervalRef.current) {
                clearInterval(gpsIntervalRef.current);
            }
            if (mockIntervalRef.current) {
                clearInterval(mockIntervalRef.current);
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
            const payload = { status: newStatus };
            
            // Include current location if GPS is enabled
            if (currentLocation) {
                payload.location = {
                    type: 'Point',
                    coordinates: [currentLocation.lng, currentLocation.lat]
                };
            }

            await updateAmbulanceStatus(myAmbulanceId, payload);
            toast.success(`Your status has been updated to ${newStatus.replace('_', ' ')}.`);
            
            // Update local state
            setMyAmbulance(prev => ({ ...prev, status: newStatus }));
            setAmbulances(prev => 
                prev.map(amb => 
                    amb._id === myAmbulanceId ? { ...amb, status: newStatus } : amb
                )
            );

            // Start GPS tracking when EN_ROUTE
            if (newStatus === 'EN_ROUTE' && !gpsTracking) {
                startGPSTracking();
            } else if (newStatus !== 'EN_ROUTE' && gpsTracking) {
                stopGPSTracking();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update status.');
            console.error(err);
        }
    };

    const handleAcceptPickupRequest = async (patientId) => {
        // Check if ambulance is available
        if (myAmbulance?.status !== 'AVAILABLE') {
            toast.error('You must be AVAILABLE to accept pickup requests');
            return;
        }

        // Check if already have an assignment
        if (myAmbulance?.assignedPatient) {
            toast.error('You already have an active assignment');
            return;
        }

        try {
            const token = getToken();
            const response = await fetch(`http://localhost:3030/ambulance/${myAmbulanceId}/accept-pickup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    patientId: patientId
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to accept pickup');
            }

            toast.success('✅ Pickup request accepted! You are now en route.');
            
            // Remove this request from the list
            setPickupRequests(prev => prev.filter(req => req.patientId !== patientId));
            
            // Reload ambulance data
            await loadData();
            
            // Start GPS tracking
            if (!gpsTracking) {
                startGPSTracking();
            }
        } catch (err) {
            console.error('Accept pickup request error:', err);
            toast.error(err.message || 'Failed to accept pickup request');
        }
    };

    const handleAcceptPickup = async () => {
        if (!myAmbulance?.assignedPatient) {
            toast.error('No patient assigned');
            return;
        }

        // Extract patient ID (handle both object and string formats)
        const patientId = typeof myAmbulance.assignedPatient === 'object' 
            ? myAmbulance.assignedPatient._id 
            : myAmbulance.assignedPatient;

        try {
            // First update status to EN_ROUTE
            await handleStatusUpdate('EN_ROUTE');
            
            // Then accept the pickup
            const token = getToken();
            const response = await fetch(`http://localhost:3030/ambulance/${myAmbulanceId}/accept-pickup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    patientId: patientId
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to accept pickup');
            }

            toast.success('✅ Pickup accepted! Patient is now in transit.');
            await loadData();
        } catch (err) {
            console.error('Accept pickup error:', err);
            toast.error(err.message || 'Failed to accept pickup');
        }
    };

    const handleApprovePickup = async () => {
        if (!myAmbulance?.assignedPatient) {
            toast.error('No patient assigned');
            return;
        }

        // Extract patient ID (handle both object and string formats)
        const patientId = typeof myAmbulance.assignedPatient === 'object' 
            ? myAmbulance.assignedPatient._id 
            : myAmbulance.assignedPatient;

        try {
            const token = getToken();
            const response = await fetch(`http://localhost:3030/ambulance/${myAmbulanceId}/approve-pickup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    patientId: patientId
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to approve pickup');
            }

            toast.success('✅ Pickup approved! Waiting for receptionist confirmation.');
            await loadData();
        } catch (err) {
            console.error('Approve pickup error:', err);
            toast.error(err.message || 'Failed to approve pickup');
        }
    };

    const handleRejectPickup = async () => {
        if (!myAmbulance?.assignedPatient) {
            toast.error('No patient assigned');
            return;
        }

        const reason = prompt('Please provide a reason for rejection (optional):');
        
        // Extract patient ID (handle both object and string formats)
        const patientId = typeof myAmbulance.assignedPatient === 'object' 
            ? myAmbulance.assignedPatient._id 
            : myAmbulance.assignedPatient;
        
        try {
            const token = getToken();
            const response = await fetch(`http://localhost:3030/ambulance/${myAmbulanceId}/reject-pickup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    patientId: patientId,
                    reason: reason || 'Crew unavailable'
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to reject pickup');
            }

            toast.info('Pickup request rejected. Patient will be reassigned.');
            await loadData();
        } catch (err) {
            console.error('Reject pickup error:', err);
            toast.error(err.message || 'Failed to reject pickup');
        }
    };

    const handleMarkArrived = async () => {
        if (!myAmbulance?.assignedPatient) {
            toast.error('No patient assigned');
            return;
        }

        // Extract patient ID (handle both object and string formats)
        const patientId = typeof myAmbulance.assignedPatient === 'object' 
            ? myAmbulance.assignedPatient._id 
            : myAmbulance.assignedPatient;

        try {
            const token = getToken();
            const response = await fetch(`http://localhost:3030/ambulance/${myAmbulanceId}/mark-arrived`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    patientId: patientId
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to mark arrival');
            }

            toast.success('🏥 Patient arrived! Receptionist can now check them in.');
            
            // Update status to arrived
            await handleStatusUpdate('ARRIVED_HOSPITAL');
            await loadData();
        } catch (err) {
            console.error('Mark arrived error:', err);
            toast.error(err.message || 'Failed to mark arrival');
        }
    };

    const startGPSTracking = () => {
        setGpsTracking(true);
        toast.info('🎭 Starting location tracking (Demo Mode)');
        useMockLocation();
    };

    // Mock location for testing/demo purposes
    const useMockLocation = () => {
        // Starting location (Cairo, Egypt)
        let mockLat = 30.0444;
        let mockLng = 31.2357;
        let moveCount = 0;

        const updateMockLocation = () => {
            // Simulate movement towards destination (move slightly each update)
            moveCount++;
            const mockPosition = {
                coords: {
                    latitude: mockLat + (moveCount * 0.001), // Move north
                    longitude: mockLng + (moveCount * 0.0015), // Move east
                    accuracy: 10
                }
            };
            
            updateLocation(mockPosition);

            // Stop after 20 updates (5 minutes) or when status changes
            if (moveCount >= 20 || !gpsTracking) {
                if (mockIntervalRef.current) {
                    clearInterval(mockIntervalRef.current);
                    mockIntervalRef.current = null;
                }
            }
        };

        // Initial mock update
        updateMockLocation();

        // Set up interval for mock updates
        mockIntervalRef.current = setInterval(updateMockLocation, 15000);
    };

    const stopGPSTracking = () => {
        if (gpsIntervalRef.current) {
            clearInterval(gpsIntervalRef.current);
            gpsIntervalRef.current = null;
        }
        if (mockIntervalRef.current) {
            clearInterval(mockIntervalRef.current);
            mockIntervalRef.current = null;
        }
        setGpsTracking(false);
        toast.info('Location tracking stopped');
    };

    const updateLocation = async (position) => {
        const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };
        
        setCurrentLocation(newLocation);

        // Calculate distance and ETA if destination is set
        if (myAmbulance?.assignedHospital || myAmbulance?.destination) {
            calculateDistanceAndETA(newLocation);
        }

        // Send location update to backend
        try {
            await updateAmbulanceStatus(myAmbulanceId, {
                location: {
                    type: 'Point',
                    coordinates: [newLocation.lng, newLocation.lat]
                }
            });
        } catch (error) {
            console.error('Failed to update location:', error);
        }
    };

    const calculateDistanceAndETA = (currentLoc) => {
        // For demo purposes, using mock destination
        // In production, use actual hospital coordinates from myAmbulance.assignedHospital
        const destinationLat = 30.0444; // Cairo example
        const destinationLng = 31.2357;

        // Haversine formula for distance
        const R = 6371; // Earth's radius in km
        const dLat = (destinationLat - currentLoc.lat) * Math.PI / 180;
        const dLon = (destinationLng - currentLoc.lng) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(currentLoc.lat * Math.PI / 180) * Math.cos(destinationLat * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const dist = R * c; // Distance in km

        setDistance(dist.toFixed(2));

        // Calculate ETA (assuming average speed of 60 km/h)
        const estimatedMinutes = Math.ceil((dist / 60) * 60);
        
        // Update ETA on backend
        updateAmbulanceStatus(myAmbulanceId, { eta: estimatedMinutes }).catch(console.error);

        // Generate simple directions
        const bearing = calculateBearing(currentLoc.lat, currentLoc.lng, destinationLat, destinationLng);
        setDirections(getDirectionFromBearing(bearing));
    };

    const calculateBearing = (lat1, lon1, lat2, lon2) => {
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
        const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
                  Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
        const bearing = Math.atan2(y, x) * 180 / Math.PI;
        return (bearing + 360) % 360;
    };

    const getDirectionFromBearing = (bearing) => {
        const directions = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
        const index = Math.round(bearing / 45) % 8;
        return directions[index];
    };

    return (
        <div className={styles.dashboard}>
            <header className={styles.header}>
                <h1>🚑 Ambulance Crew Dashboard</h1>
                <p>Real-time location tracking and live coordination</p>
            </header>

            {/* Available Pickup Requests - Broadcast to all ambulances */}
            {pickupRequests.length > 0 && myAmbulance?.status === 'AVAILABLE' && !myAmbulance?.assignedPatient && (
                <section className={styles.formCard} style={{ marginBottom: '30px', backgroundColor: '#fff3e0', borderLeft: '4px solid #ff9800' }}>
                    <h3>🚨 Available Pickup Requests ({pickupRequests.length})</h3>
                    <p style={{ marginBottom: '15px', color: '#555' }}>Choose a patient to pick up. First come, first served!</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {pickupRequests.map((request) => (
                            <div key={request.patientId} style={{
                                padding: '15px',
                                backgroundColor: 'white',
                                border: '2px solid #ff9800',
                                borderRadius: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <h4 style={{ margin: '0 0 8px 0', color: '#0d47a1' }}>
                                        👤 {request.patientName}
                                    </h4>
                                    <p style={{ margin: '4px 0', fontSize: '0.95em' }}>
                                        <strong>📍 Pickup Location:</strong> {request.pickupLocation}
                                    </p>
                                    <p style={{ margin: '4px 0', fontSize: '0.95em' }}>
                                        <strong>🏥 Destination:</strong> {request.hospitalName}
                                    </p>
                                    <p style={{ margin: '4px 0', fontSize: '0.95em' }}>
                                        <strong>🛏️ ICU:</strong> {request.specialization} - Room {request.room}
                                    </p>
                                    {request.patientPhone && (
                                        <p style={{ margin: '4px 0', fontSize: '0.95em' }}>
                                            <strong>📞 Contact:</strong> {request.patientPhone}
                                        </p>
                                    )}
                                    <p style={{ margin: '8px 0 0 0', fontSize: '0.85em', color: '#666' }}>
                                        ⏰ Requested: {new Date(request.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                                <Button 
                                    variant="success"
                                    onClick={() => handleAcceptPickupRequest(request.patientId)}
                                    style={{ minWidth: '120px' }}
                                >
                                    ✅ Accept Pickup
                                </Button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Status Control Section */}
            <section className={styles.formCard} style={{ marginBottom: '30px' }}>
                <h3>My Status (Ambulance ID: {myAmbulanceId?.substring(0, 8) || 'N/A'})</h3>
                {myAmbulance ? (
                    <div>
                        <p><strong>Name:</strong> {myAmbulance.firstName} {myAmbulance.lastName}</p>
                        <p><strong>Username:</strong> {myAmbulance.userName}</p>
                        <p><strong>Current Status:</strong> <span className={styles.statusBadge}>{myAmbulance.status?.replace('_', ' ')}</span></p>
                        {myAmbulance.assignedPatient && (
                            <p><strong>Assigned Patient:</strong> {
                                typeof myAmbulance.assignedPatient === 'object' 
                                    ? `${myAmbulance.assignedPatient.firstName} ${myAmbulance.assignedPatient.lastName}`
                                    : myAmbulance.assignedPatient
                            }</p>
                        )}
                        {myAmbulance.destination && (
                            <p><strong>Destination:</strong> {myAmbulance.destination}</p>
                        )}
                        {myAmbulance.eta && (
                            <p><strong>ETA:</strong> {myAmbulance.eta} minutes</p>
                        )}
                    </div>
                ) : <p>Loading your details...</p>}
                
                {/* Active Transport - Already accepted and EN_ROUTE */}
                {myAmbulance?.assignedPatient && myAmbulance?.status === 'EN_ROUTE' && (
                    <div style={{ 
                        marginTop: '20px', 
                        padding: '15px', 
                        backgroundColor: '#fff3cd', 
                        border: '2px solid #ffc107',
                        borderRadius: '8px'
                    }}>
                        <h4 style={{ color: '#856404', marginBottom: '10px' }}>🚨 Active Transport</h4>
                        <p><strong>Patient:</strong> {
                            typeof myAmbulance.assignedPatient === 'object' 
                                ? `${myAmbulance.assignedPatient.firstName} ${myAmbulance.assignedPatient.lastName}`
                                : myAmbulance.assignedPatient
                        }</p>
                        <p><strong>Destination:</strong> {myAmbulance.destination || 'Hospital'}</p>
                        {myAmbulance.eta && (
                            <p><strong>ETA:</strong> {myAmbulance.eta} minutes</p>
                        )}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                            <Button 
                                variant="primary"
                                onClick={handleMarkArrived}
                            >
                                🏥 Mark Patient Arrived
                            </Button>
                        </div>
                    </div>
                )}
                
                <div className={styles.grid} style={{ marginTop: '20px' }}>
                    <Button 
                        variant="success" 
                        onClick={() => handleStatusUpdate('EN_ROUTE')}
                        disabled={myAmbulance?.status === 'EN_ROUTE' || loading}
                    >
                        🚨 Mark EN ROUTE
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={() => handleStatusUpdate('ARRIVED_HOSPITAL')}
                        disabled={myAmbulance?.status === 'ARRIVED_HOSPITAL' || loading}
                    >
                        🏥 Mark ARRIVED
                    </Button>
                    <Button 
                        variant="secondary" 
                        onClick={() => handleStatusUpdate('AVAILABLE')}
                        disabled={myAmbulance?.status === 'AVAILABLE' || loading}
                    >
                        ✅ Mark AVAILABLE
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

export default AmbulancePanel;