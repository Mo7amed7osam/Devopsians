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
    getMyAcceptedRequest,
    notifyPatientWaiting,
} from '../../utils/api';
import { getUserId, getToken } from '../../utils/cookieUtils';
import socket from '../../utils/socket';
import { API_BASE } from '../../utils/api';

const AmbulancePanel = () => {
    const [ambulances, setAmbulances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [myAmbulance, setMyAmbulance] = useState(null);
    const [pickupRequests, setPickupRequests] = useState([]); // All available pickup requests
    const [gpsTracking, setGpsTracking] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [distance, setDistance] = useState(null);
    const [directions, setDirections] = useState(null);
    const [hasPickedUp, setHasPickedUp] = useState(false); // toggle to show route to hospital after pickup
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
                    toast.info(`New assignment: ${data.destination}`);
                    loadData(); // Reload to get updated assignment
                }
            });

            // Listen for pickup requests from patients
            socket.on('ambulancePickupRequest', (data) => {
                console.log('Received pickup request:', data);
                
                toast.info(`New pickup request from ${data.patientName || 'patient'} - tap to refresh list`, {
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
                    toast.success(`Pickup accepted. You are now en route to pick up the patient.`, {
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
                if (isValidCoordinatePair(myAmb.currentLocation?.coordinates)) {
                    const [lng, lat] = myAmb.currentLocation.coordinates;
                    loadAmbulanceRequests({
                        latitude: lat,
                        longitude: lng
                    });
                    // Initialize currentLocation marker and center to fix disappearing pin
                    setCurrentLocation({
                        lat,
                        lng
                    });
                    setMapCenter({
                        lat,
                        lng
                    });
                }

                // If ambulance has an active assignment, fetch the pickup location
                if (myAmb.assignedPatient && myAmb.status === 'EN_ROUTE') {
                    loadActivePickupLocation();
                } else {
                    setActivePickup(null);
                    setHasPickedUp(false);
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
            const loc = location || (isValidCoordinatePair(myAmbulance?.currentLocation?.coordinates) 
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
            
            if (request && isValidCoordinatePair(request.pickupCoordinates?.coordinates)) {
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
                toast.success('Pickup request accepted. You are now en route.');
                
                // Find the accepted request to get pickup coordinates
                const acceptedReq = pickupRequests.find(req => req.requestId === requestId);
                if (acceptedReq && isValidCoordinatePair(acceptedReq.pickupCoords)) {
                    const [lng, lat] = acceptedReq.pickupCoords;
                    setActivePickup({
                        patientName: acceptedReq.patientName,
                        pickupLocation: acceptedReq.pickupLocation,
                        coordinates: acceptedReq.pickupCoords, // [lng, lat]
                        hospitalName: acceptedReq.hospitalName
                    });
                    // Center map on patient location
                    setMapCenter({ lat, lng });
                }
                
                // Remove this request from the list
                setPickupRequests(prev => prev.filter(req => req.requestId !== requestId));
                
                // Reload ambulance data
                await loadData();
                // Automatically set status to EN_ROUTE if not already
                if (myAmbulance?.status !== 'EN_ROUTE') {
                    await handleStatusUpdate('EN_ROUTE');
                }
                // Start GPS tracking (handleStatusUpdate also starts it, but keep fallback)
                if (!gpsTracking) startGPSTracking();
            }
        } catch (err) {
            console.error('Accept pickup request error:', err);
            toast.error(err.response?.data?.message || 'Failed to accept pickup request');
        }
    };

    const handleAcceptPickup = async () => {
        // In the new flow, this button confirms the patient is onboard (UI only)
        // and switches routing to the hospital. Do not call the legacy accept-pickup API
        // because backend requires status AVAILABLE and we are already EN_ROUTE.
        if (!myAmbulance?.assignedPatient) {
            toast.error('No patient assigned');
            return;
        }
        setActivePickup(null);
        setHasPickedUp(true);
        toast.success('Patient picked up. Routing to hospital.');
    };

    const handleNotifyPatientWaiting = async () => {
        if (!myAmbulance?.assignedPatient) {
            toast.error('No patient assigned');
            return;
        }

        const patientId = typeof myAmbulance.assignedPatient === 'object'
            ? myAmbulance.assignedPatient._id
            : myAmbulance.assignedPatient;

        try {
            await notifyPatientWaiting(myAmbulanceId, { patientId });
            toast.success('Patient notified that you are waiting at pickup.');
        } catch (err) {
            console.error('Notify patient waiting error:', err);
            toast.error(err.response?.data?.message || 'Failed to notify patient');
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
            const response = await fetch(`${API_BASE}/ambulance/${myAmbulanceId}/approve-pickup`, {
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

            toast.success('Pickup approved. Waiting for receptionist confirmation.');
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
            const response = await fetch(`${API_BASE}/ambulance/${myAmbulanceId}/reject-pickup`, {
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
            const response = await fetch(`${API_BASE}/ambulance/${myAmbulanceId}/mark-arrived`, {
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

            toast.success('Patient arrived. Receptionist can now check them in.');
            
            // Update status to arrived
            await handleStatusUpdate('ARRIVED_HOSPITAL');
            // Clear active pickup locally
            setActivePickup(null);
            // Automatically mark AVAILABLE immediately after arrival
            await handleStatusUpdate('AVAILABLE');
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
            try {
                const watchId = navigator.geolocation.watchPosition(
                    (pos) => updateLocation(pos),
                    (err) => {
                        // Silently fall back to mock location if GPS unavailable
                        useMockLocation();
                    },
                    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
                );
                gpsIntervalRef.current = watchId; // reuse ref to store watchId
            } catch (e) {
                // Silently use mock location if geolocation fails
                useMockLocation();
            }
        } else {
            // Silently use mock location if GPS not supported
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
            // Silently ignore location update errors (likely auth issues when not logged in)
        }
    };

    const calculateDistanceAndETA = (currentLoc) => {
        if (!currentLoc || typeof currentLoc.lat !== 'number' || typeof currentLoc.lng !== 'number' || isNaN(currentLoc.lat) || isNaN(currentLoc.lng)) {
            return;
        }
        // Prefer selected request's pickup as destination for routing visualization
        let destinationLat = 30.0444;
        let destinationLng = 31.2357;
        if (isValidCoordinatePair(selectedRequest?.pickupCoords)) {
            destinationLng = selectedRequest.pickupCoords[0];
            destinationLat = selectedRequest.pickupCoords[1];
        } else if (isValidCoordinatePair(myAmbulance?.assignedHospital?.location?.coordinates)) {
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
            if (
                center &&
                typeof center.lat === 'number' &&
                typeof center.lng === 'number' &&
                !isNaN(center.lat) &&
                !isNaN(center.lng)
            ) {
                map.flyTo([center.lat, center.lng], 13);
            }
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

    const isValidCoordinatePair = (coords) => Array.isArray(coords) && coords.length === 2 &&
        typeof coords[0] === 'number' && typeof coords[1] === 'number' &&
        !isNaN(coords[0]) && !isNaN(coords[1]);

    const hasValidCurrentLocation = () =>
        currentLocation &&
        typeof currentLocation.lat === 'number' &&
        typeof currentLocation.lng === 'number' &&
        !isNaN(currentLocation.lat) &&
        !isNaN(currentLocation.lng);

    return (
        <div className={styles.dashboard}>
            <header className={styles.header}>
                <h1>Ambulance Crew Dashboard</h1>
                <p>Real-time location tracking and live coordination</p>
            </header>

            {/* Available Pickup Requests - Broadcast to all ambulances */}
            {pickupRequests.length > 0 && myAmbulance?.status === 'AVAILABLE' && !myAmbulance?.assignedPatient && (
                <section className={styles.formCard} style={{ marginBottom: '30px', backgroundColor: 'var(--color-accent-soft)', borderLeft: '4px solid var(--color-accent)' }}>
                    <h3>Available Pickup Requests ({pickupRequests.length})</h3>
                    <p style={{ marginBottom: '15px', color: 'var(--color-ink-muted)' }}>Choose a patient to pick up. First come, first served!</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {pickupRequests.map((request) => (
                            <div key={request.requestId || request.patientId} style={{
                                padding: '15px',
                                backgroundColor: 'var(--color-surface)',
                                border: request.urgency === 'critical' ? '3px solid var(--color-danger)' : 
                                        request.urgency === 'urgent' ? '2px solid var(--color-accent)' : '2px solid rgba(245, 158, 11, 0.6)',
                                borderRadius: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                        <h4 style={{ margin: 0, color: 'var(--color-primary-strong)' }}>
                                            {request.patientName}
                                        </h4>
                                        {request.urgency && (
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.75em',
                                                fontWeight: 'bold',
                                                textTransform: 'uppercase',
                                                backgroundColor: request.urgency === 'critical' ? 'var(--color-danger)' : 
                                                                request.urgency === 'urgent' ? 'var(--color-accent)' : 'var(--color-ink-subtle)',
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
                                                backgroundColor: 'var(--color-primary)',
                                                color: '#fff'
                                            }}>
                                                Distance: {Number(request.distance).toFixed(1)} km
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ margin: '4px 0', fontSize: '0.95em' }}>
                                        <strong>Pickup Location:</strong> {request.pickupLocation}
                                    </p>
                                    <p style={{ margin: '4px 0', fontSize: '0.95em' }}>
                                        <strong>Destination:</strong> {request.hospitalName}
                                    </p>
                                    <p style={{ margin: '4px 0', fontSize: '0.95em' }}>
                                        <strong>ICU:</strong> {request.specialization} - Room {request.room}
                                    </p>
                                    {request.patientPhone && (
                                        <p style={{ margin: '4px 0', fontSize: '0.95em' }}>
                                            <strong>Contact:</strong> {request.patientPhone}
                                        </p>
                                    )}
                                    <p style={{ margin: '8px 0 0 0', fontSize: '0.85em', color: 'var(--color-ink-subtle)' }}>
                                        Requested: {new Date(request.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                                <Button 
                                    variant="success"
                                    onClick={() => handleAcceptPickupRequest(request.requestId)}
                                    style={{ minWidth: '120px' }}
                                >
                                    Accept Pickup
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
                        <p><strong>Current Status:</strong> <span className={styles.statusBadge} style={{ backgroundColor: 'transparent', color: '#000', fontWeight: 'normal' }}>{myAmbulance.status?.replace('_', ' ')}</span></p>
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
                        backgroundColor: 'var(--color-accent-soft)', 
                        border: '2px solid var(--color-accent)',
                        borderRadius: '8px'
                    }}>
                        <h4 style={{ color: '#92400e', marginBottom: '10px' }}>Active Transport</h4>
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
                                Mark Patient Arrived
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={handleNotifyPatientWaiting}
                            >
                                Notify Patient I'm Waiting
                            </Button>
                            <Button
                                variant="success"
                                onClick={handleAcceptPickup}
                            >
                                Patient Picked Up
                            </Button>
                        </div>
                    </div>
                )}
                
                {/* Manual status controls removed: now transitions are automatic.
                    Accepting a pickup sets EN_ROUTE; marking arrival sets ARRIVED_HOSPITAL then AVAILABLE. */}
            </section>

            {/* Requests Sidebar + Map Section */}
            <section className={styles.statusPanel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0 }}>Pickup Requests</h3>
                </div>
                <div className={styles.requestsLayout}>
                    {/* Sidebar list */}
                    <aside className={styles.requestsSidebar}>
                        <div className={styles.requestsList}>
                            {pickupRequests.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <p><strong>No pending pickup requests</strong></p>
                                    <p>When patients request ambulance pickup, they will appear here.</p>
                                    <p style={{ marginTop: '10px', fontSize: '0.85em' }}>
                                        Status: <strong>{myAmbulance?.status?.replace('_', ' ') || 'Loading...'}</strong>
                                    </p>
                                </div>
                            ) : (
                                pickupRequests.map((req) => (
                                    <div key={req.requestId} className={styles.requestItem}>
                                        <div className={styles.requestHeader}>
                                            <strong>{req.patientName}</strong>
                                            {req.urgency && (
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '12px', fontSize: '0.75em', fontWeight: 'bold',
                                                    backgroundColor: req.urgency === 'critical' ? 'var(--color-danger)' : req.urgency === 'urgent' ? 'var(--color-accent)' : 'var(--color-ink-subtle)',
                                                    color: req.urgency === 'urgent' ? '#000' : '#fff'
                                                }}>
                                                    {req.urgency}
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.requestMeta}>
                                            <div>{req.pickupLocation}</div>
                                            <div>{req.hospitalName}</div>
                                            {(() => {
                                                const hasServerDist = req.distance !== undefined && req.distance !== null;
                                                const hasCoords = hasValidCurrentLocation() && isValidCoordinatePair(req.pickupCoords);
                                                const computed = hasCoords ? distanceKm(currentLocation.lat, currentLocation.lng, req.pickupCoords[1], req.pickupCoords[0]) : null;
                                                const shown = hasServerDist ? Number(req.distance) : computed;
                                                return shown != null ? (
                                                    <div>Distance: {Number(shown).toFixed(1)} km</div>
                                                ) : null;
                                            })()}
                                            <div>{new Date(req.timestamp).toLocaleTimeString()}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                            <Button
                                                variant="secondary"
                                                onClick={() => {
                                                    setSelectedRequest(req);
                                                    if (isValidCoordinatePair(req.pickupCoords)) {
                                                        setMapCenter({ lat: req.pickupCoords[1], lng: req.pickupCoords[0] });
                                                    }
                                                }}
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
                    <div className={styles.mapPanel}>
                        <div className={styles.mapToolbar}>
                            <div>
                                <h4 className={styles.mapTitle}>Live Map</h4>
                                <div className={styles.mapMeta}>
                                    {hasValidCurrentLocation()
                                        ? `Current: ${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`
                                        : 'Enable tracking to show your live location.'}
                                </div>
                            </div>
                            <Button
                                variant={gpsTracking ? 'secondary' : 'primary'}
                                onClick={() => (gpsTracking ? stopGPSTracking() : startGPSTracking())}
                            >
                                {gpsTracking ? 'Stop Tracking' : 'Start Tracking'}
                            </Button>
                        </div>
                        <div className={styles.mapBox}>
                    <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={12} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                        <FlyTo center={mapCenter} />
                        <MyLocationControl />
                        {/* Ambulance current location marker */}
                        {hasValidCurrentLocation() && (
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
                        {pickupRequests.map((req) => {
                            const validCoords = isValidCoordinatePair(req.pickupCoords);
                            return validCoords ? (
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
                                        }
                                    }}
                                >
                                    <Popup>
                                        <strong>Pickup Request</strong><br />
                                        {req.patientName}<br />
                                        {req.pickupLocation}
                                    </Popup>
                                </Marker>
                            ) : null;
                        })}
                        {/* Lines from ambulance to each request showing distance */}
                        {hasValidCurrentLocation() && pickupRequests.map((req) => (
                            isValidCoordinatePair(req.pickupCoords) ? (
                                <Polyline
                                    key={`line-${req.requestId}`}
                                    positions={[[currentLocation.lat, currentLocation.lng], [req.pickupCoords[1], req.pickupCoords[0]]]}
                                    pathOptions={{ color: 'var(--color-ink-subtle)', weight: 2, opacity: 0.6, dashArray: '6 6' }}
                                >
                                    <Popup>
                                        {(() => {
                                            const dist = distanceKm(currentLocation.lat, currentLocation.lng, req.pickupCoords[1], req.pickupCoords[0]);
                                            return <div>Distance: {dist.toFixed(2)} km</div>;
                                        })()}
                                    </Popup>
                                </Polyline>
                            ) : null
                        ))}
                        {/* Simple route polyline from ambulance to selected pickup */}
                        {hasValidCurrentLocation() && isValidCoordinatePair(selectedRequest?.pickupCoords) && (
                            <Polyline
                                positions={[[currentLocation.lat, currentLocation.lng], [selectedRequest.pickupCoords[1], selectedRequest.pickupCoords[0]]]}
                                pathOptions={{ color: 'var(--color-primary)', weight: 4, opacity: 0.8 }}
                            />
                        )}
                        {/* Active Pickup - Patient location marker and route line */}
                        {activePickup && isValidCoordinatePair(activePickup.coordinates) && (
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
                                            <strong>Patient Pickup Location</strong>
                                            <div><strong>Patient:</strong> {activePickup.patientName}</div>
                                            <div><strong>Location:</strong> {activePickup.pickupLocation}</div>
                                            <div><strong>Destination:</strong> {activePickup.hospitalName}</div>
                                            {hasValidCurrentLocation() && (() => {
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
                                {hasValidCurrentLocation() && (
                                    <Polyline
                                        positions={[
                                            [currentLocation.lat, currentLocation.lng],
                                            [activePickup.coordinates[1], activePickup.coordinates[0]]
                                        ]}
                                        pathOptions={{ color: 'var(--color-success)', weight: 4, opacity: 0.8 }}
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
                                                        <strong>En Route to Patient</strong>
                                                        <div>Distance: {dist.toFixed(2)} km</div>
                                                    </div>
                                                );
                                            })()}
                                        </Popup>
                                    </Polyline>
                                )}
                            </>
                        )}

                        {/* After pickup: route from ambulance to hospital */}
                        {hasValidCurrentLocation() && hasPickedUp && isValidCoordinatePair(myAmbulance?.assignedHospital?.location?.coordinates) && (
                            <Polyline
                                positions={[
                                    [currentLocation.lat, currentLocation.lng],
                                    [myAmbulance.assignedHospital.location.coordinates[1], myAmbulance.assignedHospital.location.coordinates[0]]
                                ]}
                                pathOptions={{ color: 'var(--color-accent)', weight: 4, opacity: 0.85 }}
                            >
                                <Popup>
                                    <div>
                                        <strong>En Route to Hospital</strong>
                                        <div>{myAmbulance.assignedHospital.name}</div>
                                    </div>
                                </Popup>
                            </Polyline>
                        )}
                    </MapContainer>
                        </div>
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
