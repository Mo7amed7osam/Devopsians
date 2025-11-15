import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'react-toastify';
import styles from './Ambulance.module.css';
import Button from '../../components/common/Button';
import { 
    getAllAmbulances, 
    updateAmbulanceStatus, 
    getActiveAmbulanceRequests, 
    acceptAmbulanceRequest,
    getMyAcceptedRequest 
} from '../../utils/api';
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
    const [mapCenter, setMapCenter] = useState({ lat: 30.0444, lng: 31.2357 });
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [activePickup, setActivePickup] = useState(null); // Stores accepted patient's pickup location
    const myAmbulanceId = getUserId();
    const gpsIntervalRef = useRef(null);
    const mockIntervalRef = useRef(null);

    useEffect(() => {
        loadData();
        loadAmbulanceRequests(); // Load sorted requests on mount

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
                
                toast.info(`🚑 New pickup request from ${data.patientName || 'patient'} - tap to refresh list`, {
                    autoClose: 8000,
                    position: "top-right",
                    onClick: () => loadAmbulanceRequests()
                });
                
                // Reload requests to get updated list with distance sorting
                loadAmbulanceRequests();
            });

            // Listen for when a pickup request is taken by another ambulance
            socket.on('pickupRequestTaken', (data) => {
                if (data.ambulanceId !== myAmbulanceId) {
                    toast.info(`Pickup request was accepted by another ambulance`, {
                        autoClose: 5000
                    });
                }
                
                // Reload requests to remove the taken request
                loadAmbulanceRequests();
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
                
                // If ambulance has location, reload requests sorted by distance
                if (myAmb.currentLocation?.coordinates) {
                    loadAmbulanceRequests({
                        latitude: myAmb.currentLocation.coordinates[1],
                        longitude: myAmb.currentLocation.coordinates[0]
                    });
                }

                // If ambulance has an active assignment, fetch the pickup location
                if (myAmb.assignedPatient && myAmb.status === 'EN_ROUTE') {
                    loadActivePickupLocation();
                } else {
                    setActivePickup(null);
                }
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to fetch ambulance data.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadAmbulanceRequests = async (location = null) => {
        try {
            // If we have ambulance location, use it for distance sorting
            const loc = location || (myAmbulance?.currentLocation?.coordinates 
                ? { 
                    latitude: myAmbulance.currentLocation.coordinates[1], 
                    longitude: myAmbulance.currentLocation.coordinates[0] 
                } 
                : null);
            
            const response = await getActiveAmbulanceRequests(loc);
            const requests = response.data?.data || [];
            
            // Transform to match old format for UI compatibility
            const transformedRequests = requests.map(req => ({
                patientId: req.patient?._id,
                patientName: req.patient ? `${req.patient.firstName} ${req.patient.lastName}` : 'Unknown Patient',
                patientPhone: req.patient?.phone,
                pickupLocation: req.pickupLocation,
                hospitalName: req.hospital?.name || 'Hospital',
                specialization: req.icu?.specialization || 'General',
                room: req.icu?.room || 'N/A',
                timestamp: req.createdAt,
                urgency: req.urgency,
                distance: req.distance, // Distance in km (if location was provided)
                requestId: req._id,
                pickupCoords: req.pickupCoordinates?.coordinates, // [lng, lat]
                hospitalCoords: req.hospital?.location?.coordinates // [lng, lat]
            }));
            
            setPickupRequests(transformedRequests);
        } catch (err) {
            console.error('Failed to load ambulance requests:', err);
        }
    };

    const loadActivePickupLocation = async () => {
        try {
            // Fetch my accepted ambulance request
            const response = await getMyAcceptedRequest();
            const request = response.data?.data;
            
            if (request && request.pickupCoordinates?.coordinates) {
                setActivePickup({
                    patientName: request.patient ? `${request.patient.firstName} ${request.patient.lastName}` : 'Patient',
                    pickupLocation: request.pickupLocation,
                    coordinates: request.pickupCoordinates.coordinates, // [lng, lat]
                    hospitalName: request.hospital?.name || 'Hospital'
                });
                
                // Center map on patient location
                setMapCenter({ 
                    lat: request.pickupCoordinates.coordinates[1], 
                    lng: request.pickupCoordinates.coordinates[0] 
                });
            } else {
                setActivePickup(null);
            }
        } catch (err) {
            console.error('Failed to load active pickup location:', err);
            setActivePickup(null);
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

    const handleAcceptPickupRequest = async (requestId) => {
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
            const response = await acceptAmbulanceRequest(requestId);
            
            if (response.data?.success) {
                toast.success('✅ Pickup request accepted! You are now en route.');
                
                // Find the accepted request to get pickup coordinates
                const acceptedReq = pickupRequests.find(req => req.requestId === requestId);
                if (acceptedReq && acceptedReq.pickupCoords) {
                    setActivePickup({
                        patientName: acceptedReq.patientName,
                        pickupLocation: acceptedReq.pickupLocation,
                        coordinates: acceptedReq.pickupCoords, // [lng, lat]
                        hospitalName: acceptedReq.hospitalName
                    });
                    // Center map on patient location
                    setMapCenter({ lat: acceptedReq.pickupCoords[1], lng: acceptedReq.pickupCoords[0] });
                }
                
                // Remove this request from the list
                setPickupRequests(prev => prev.filter(req => req.requestId !== requestId));
                
                // Reload ambulance data
                await loadData();
                
                // Start GPS tracking
                if (!gpsTracking) {
                    startGPSTracking();
                }
            }
        } catch (err) {
            console.error('Accept pickup request error:', err);
            toast.error(err.response?.data?.message || 'Failed to accept pickup request');
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
        if (gpsTracking) return;
        setGpsTracking(true);
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
            toast.info('📡 Starting GPS tracking');
            try {
                const watchId = navigator.geolocation.watchPosition(
                    (pos) => updateLocation(pos),
                    (err) => {
                        console.warn('Geolocation error:', err);
                        toast.warn('GPS unavailable. Using demo movement.');
                        useMockLocation();
                    },
                    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
                );
                gpsIntervalRef.current = watchId; // reuse ref to store watchId
            } catch (e) {
                console.warn('Geolocation watch failed, using mock:', e);
                toast.warn('GPS unavailable. Using demo movement.');
                useMockLocation();
            }
        } else {
            toast.warn('GPS not supported. Using demo movement.');
            useMockLocation();
        }
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
            // Clear geolocation watcher if set; if mock interval id accidentally here, clear it as interval
            try { navigator?.geolocation && navigator.geolocation.clearWatch(gpsIntervalRef.current); } catch {}
            try { clearInterval(gpsIntervalRef.current); } catch {}
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
        // Prefer selected request's pickup as destination for routing visualization
        let destinationLat = 30.0444;
        let destinationLng = 31.2357;
        if (selectedRequest?.pickupCoords && selectedRequest.pickupCoords.length === 2) {
            destinationLng = selectedRequest.pickupCoords[0];
            destinationLat = selectedRequest.pickupCoords[1];
        } else if (myAmbulance?.assignedHospital?.location?.coordinates?.length === 2) {
            destinationLng = myAmbulance.assignedHospital.location.coordinates[0];
            destinationLat = myAmbulance.assignedHospital.location.coordinates[1];
        }

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

    // Helper component to fly map to a center
    const FlyTo = ({ center }) => {
        const map = useMap();
        useEffect(() => {
            if (center) map.flyTo([center.lat, center.lng], 13);
        }, [center]);
        return null;
    };

    // Custom control for "My Location" button
    const MyLocationControl = () => {
        const map = useMap();

        useEffect(() => {
            const myLocationButton = L.control({ position: 'topright' });

            myLocationButton.onAdd = function () {
                const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                div.innerHTML = `
                    <button 
                        style="
                            background: white;
                            border: 2px solid rgba(0,0,0,0.2);
                            border-radius: 4px;
                            width: 34px;
                            height: 34px;
                            cursor: pointer;
                            font-size: 18px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        "
                        title="My Location"
                    >
                        📍
                    </button>
                `;
                
                div.onclick = function (e) {
                    e.stopPropagation();
                    if (currentLocation) {
                        map.flyTo([currentLocation.lat, currentLocation.lng], 15);
                    } else {
                        // Start GPS tracking if not already running
                        toast.info('Starting GPS tracking...');
                        if (!gpsTracking) {
                            startGPSTracking();
                        }
                        // Wait a moment for location to be acquired
                        setTimeout(() => {
                            if (currentLocation) {
                                map.flyTo([currentLocation.lat, currentLocation.lng], 15);
                            }
                        }, 1000);
                    }
                };

                return div;
            };

            myLocationButton.addTo(map);

            return () => {
                myLocationButton.remove();
            };
        }, [map]);

        return null;
    };

    // Haversine distance (km) for client-side labels
    const distanceKm = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
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
                            <div key={request.requestId || request.patientId} style={{
                                padding: '15px',
                                backgroundColor: 'white',
                                border: request.urgency === 'critical' ? '3px solid #dc3545' : 
                                        request.urgency === 'urgent' ? '2px solid #ffc107' : '2px solid #ff9800',
                                borderRadius: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                        <h4 style={{ margin: 0, color: '#0d47a1' }}>
                                            👤 {request.patientName}
                                        </h4>
                                        {request.urgency && (
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.75em',
                                                fontWeight: 'bold',
                                                textTransform: 'uppercase',
                                                backgroundColor: request.urgency === 'critical' ? '#dc3545' : 
                                                                request.urgency === 'urgent' ? '#ffc107' : '#6c757d',
                                                color: request.urgency === 'urgent' ? '#000' : '#fff'
                                            }}>
                                                {request.urgency}
                                            </span>
                                        )}
                                        {request.distance !== undefined && (
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.75em',
                                                fontWeight: 'bold',
                                                backgroundColor: '#007bff',
                                                color: '#fff'
                                            }}>
                                                📏 {Number(request.distance).toFixed(1)} km away
                                            </span>
                                        )}
                                    </div>
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
                                    onClick={() => handleAcceptPickupRequest(request.requestId)}
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

            {/* Requests Sidebar + Map Section */}
            <section className={styles.statusPanel}>
                <h3>Pickup Requests</h3>
                <div className={styles.requestsLayout}>
                    {/* Sidebar list */}
                    <aside className={styles.requestsSidebar}>
                        <div className={styles.requestsList}>
                            {pickupRequests.length === 0 ? (
                                <div className={styles.placeholder}>No pending pickup requests</div>
                            ) : (
                                pickupRequests.map((req) => (
                                    <div key={req.requestId} className={styles.requestItem}>
                                        <div className={styles.requestHeader}>
                                            <strong>👤 {req.patientName}</strong>
                                            {req.urgency && (
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '12px', fontSize: '0.75em', fontWeight: 'bold',
                                                    backgroundColor: req.urgency === 'critical' ? '#dc3545' : req.urgency === 'urgent' ? '#ffc107' : '#6c757d',
                                                    color: req.urgency === 'urgent' ? '#000' : '#fff'
                                                }}>
                                                    {req.urgency}
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.requestMeta}>
                                            <div>📍 {req.pickupLocation}</div>
                                            <div>🏥 {req.hospitalName}</div>
                                            {(() => {
                                                const hasServerDist = req.distance !== undefined && req.distance !== null;
                                                const hasCoords = currentLocation && Array.isArray(req.pickupCoords) && req.pickupCoords.length === 2;
                                                const computed = hasCoords ? distanceKm(currentLocation.lat, currentLocation.lng, req.pickupCoords[1], req.pickupCoords[0]) : null;
                                                const shown = hasServerDist ? Number(req.distance) : computed;
                                                return shown != null ? (
                                                    <div>📏 {Number(shown).toFixed(1)} km away</div>
                                                ) : null;
                                            })()}
                                            <div>🕒 {new Date(req.timestamp).toLocaleTimeString()}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                            <Button
                                                variant="secondary"
                                                onClick={() => { setSelectedRequest(req); req.pickupCoords && setMapCenter({ lat: req.pickupCoords[1], lng: req.pickupCoords[0] }); }}
                                            >
                                                View on map
                                            </Button>
                                            <Button
                                                variant="success"
                                                onClick={() => handleAcceptPickupRequest(req.requestId)}
                                            >
                                                On my way
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </aside>
                    {/* Map */}
                    <div style={{ height: 450, width: '100%', borderRadius: 8, overflow: 'hidden' }}>
                    <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={12} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                        <FlyTo center={mapCenter} />
                        <MyLocationControl />
                        {/* Ambulance current location marker */}
                        {currentLocation && (
                            <Marker position={[currentLocation.lat, currentLocation.lng]} icon={L.icon({
                                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                                iconSize: [25,41], iconAnchor: [12,41]
                            })}>
                                <Popup>
                                    <strong>My Ambulance</strong>
                                    <div>Status: {myAmbulance?.status || 'N/A'}</div>
                                </Popup>
                            </Marker>
                        )}
                        {/* Pickup requests markers */}
                        {pickupRequests.map((req) => 
                            req.pickupCoords?.length === 2 && (
                                <Marker key={req.requestId}
                                    position={[req.pickupCoords[1], req.pickupCoords[0]]}
                                    icon={L.icon({
                                        iconUrl:
                                            req.urgency === 'critical'
                                                ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png'
                                                : req.urgency === 'urgent'
                                                ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png'
                                                : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
                                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                                        iconSize: [25, 41],
                                        iconAnchor: [12, 41]
                                    })}
                                    eventHandlers={{
                                        click: () => {
                                            setSelectedRequest(req);
                                            setMapCenter({ lat: req.pickupCoords[1], lng: req.pickupCoords[0] });
                                        }
                                    }}
                                >
                                    <Popup>
                                        <div style={{ minWidth: 200 }}>
                                            <strong>{req.patientName}</strong>
                                            <div>📍 {req.pickupLocation}</div>
                                            <div>🏥 {req.hospitalName}</div>
                                            {(() => {
                                                const hasServerDist = req.distance !== undefined && req.distance !== null;
                                                const hasCoords = currentLocation && Array.isArray(req.pickupCoords) && req.pickupCoords.length === 2;
                                                const computed = hasCoords ? distanceKm(currentLocation.lat, currentLocation.lng, req.pickupCoords[1], req.pickupCoords[0]) : null;
                                                const shown = hasServerDist ? Number(req.distance) : computed;
                                                return shown != null ? (
                                                    <div>📏 {Number(shown).toFixed(1)} km away</div>
                                                ) : null;
                                            })()}
                                            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                                                <Button variant="success" onClick={() => handleAcceptPickupRequest(req.requestId)}>Accept</Button>
                                                <Button variant="secondary" onClick={() => setSelectedRequest(req)}>Route</Button>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            )
                        )}
                        {/* Lines from ambulance to each request showing distance */}
                        {currentLocation && pickupRequests.map((req) => (
                            Array.isArray(req.pickupCoords) && req.pickupCoords.length === 2 ? (
                                <Polyline
                                    key={`line-${req.requestId}`}
                                    positions={[[currentLocation.lat, currentLocation.lng], [req.pickupCoords[1], req.pickupCoords[0]]]}
                                    pathOptions={{ color: '#6c757d', weight: 2, opacity: 0.6, dashArray: '6 6' }}
                                >
                                    <Popup>
                                        {(() => {
                                            const dist = distanceKm(currentLocation.lat, currentLocation.lng, req.pickupCoords[1], req.pickupCoords[0]);
                                            return <div>📏 {dist.toFixed(2)} km</div>;
                                        })()}
                                    </Popup>
                                </Polyline>
                            ) : null
                        ))}
                        {/* Simple route polyline from ambulance to selected pickup */}
                        {currentLocation && selectedRequest?.pickupCoords?.length === 2 && (
                            <Polyline
                                positions={[[currentLocation.lat, currentLocation.lng], [selectedRequest.pickupCoords[1], selectedRequest.pickupCoords[0]]]}
                                pathOptions={{ color: '#007bff', weight: 4, opacity: 0.8 }}
                            />
                        )}
                        {/* Active Pickup - Patient location marker and route line */}
                        {activePickup && activePickup.coordinates?.length === 2 && (
                            <>
                                {/* Patient marker at pickup location */}
                                <Marker
                                    position={[activePickup.coordinates[1], activePickup.coordinates[0]]}
                                    icon={L.icon({
                                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                                        iconSize: [25, 41],
                                        iconAnchor: [12, 41]
                                    })}
                                >
                                    <Popup>
                                        <div style={{ minWidth: 200 }}>
                                            <strong>📍 Patient Pickup Location</strong>
                                            <div><strong>Patient:</strong> {activePickup.patientName}</div>
                                            <div><strong>Location:</strong> {activePickup.pickupLocation}</div>
                                            <div><strong>Destination:</strong> {activePickup.hospitalName}</div>
                                            {currentLocation && (() => {
                                                const dist = distanceKm(
                                                    currentLocation.lat,
                                                    currentLocation.lng,
                                                    activePickup.coordinates[1],
                                                    activePickup.coordinates[0]
                                                );
                                                return <div><strong>Distance:</strong> {dist.toFixed(2)} km</div>;
                                            })()}
                                        </div>
                                    </Popup>
                                </Marker>
                                {/* Distance line from ambulance to patient */}
                                {currentLocation && (
                                    <Polyline
                                        positions={[
                                            [currentLocation.lat, currentLocation.lng],
                                            [activePickup.coordinates[1], activePickup.coordinates[0]]
                                        ]}
                                        pathOptions={{ color: '#28a745', weight: 4, opacity: 0.8 }}
                                    >
                                        <Popup>
                                            {(() => {
                                                const dist = distanceKm(
                                                    currentLocation.lat,
                                                    currentLocation.lng,
                                                    activePickup.coordinates[1],
                                                    activePickup.coordinates[0]
                                                );
                                                return (
                                                    <div>
                                                        <strong>🚑 En Route to Patient</strong>
                                                        <div>📏 Distance: {dist.toFixed(2)} km</div>
                                                    </div>
                                                );
                                            })()}
                                        </Popup>
                                    </Polyline>
                                )}
                            </>
                        )}
                    </MapContainer>
                    </div>
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