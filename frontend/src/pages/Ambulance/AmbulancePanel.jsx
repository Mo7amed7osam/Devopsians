import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import styles from './Ambulance.module.css';
import Button from '../../components/common/Button';
import { getAllAmbulances, updateAmbulanceStatus } from '../../utils/api';
import { getUserId } from '../../utils/cookieUtils';
import socket from '../../utils/socket';

const AmbulancePanel = () => {
    const [ambulances, setAmbulances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [myAmbulance, setMyAmbulance] = useState(null);
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
        }

        return () => {
            if (socket) {
                socket.off('ambulanceStatusUpdate');
                socket.off('ambulanceAssigned');
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

    // GPS Tracking Functions
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


            {/* Status Control Section */}
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