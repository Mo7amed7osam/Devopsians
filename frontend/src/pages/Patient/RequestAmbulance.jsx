import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './RequestAmbulance.module.css';
import Button from '../../components/common/Button';
import SecureInput from '../../components/common/SecureInput';
import SecureTextarea from '../../components/common/SecureTextarea';
import SecureSelect from '../../components/common/SecureSelect';
import { getUserId, getToken } from '../../utils/cookieUtils';
import { showUserDetails } from '../../utils/api';
import socket from '../../utils/socket';
import { API_BASE } from '../../utils/api';
import useOsrmRoute from '../../hooks/useOsrmRoute';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map clicks
function LocationPicker({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

const RequestAmbulance = () => {
  const [patientData, setPatientData] = useState(null);
  const [pickupLocation, setPickupLocation] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [urgency, setUrgency] = useState('normal');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasActiveRequest, setHasActiveRequest] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [ambulanceTracking, setAmbulanceTracking] = useState(null);

  const ambulanceCoords =
    ambulanceTracking?.currentLocation?.coordinates &&
    Array.isArray(ambulanceTracking.currentLocation.coordinates) &&
    ambulanceTracking.currentLocation.coordinates.length === 2
      ? {
          lat: ambulanceTracking.currentLocation.coordinates[1],
          lng: ambulanceTracking.currentLocation.coordinates[0],
        }
      : null;

  const { routeCoords, distanceKm, etaMinutes } = useOsrmRoute({
    from: ambulanceCoords,
    to: pickupCoords,
    enabled: Boolean(ambulanceCoords && pickupCoords),
  });

  useEffect(() => {
    loadPatientData();
    checkActiveRequest();

    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(coords);
          setPickupCoords(coords);
        },
        (error) => {
          // Silently handle geolocation errors - use default location
          const defaultCoords = { lat: 30.0444, lng: 31.2357 };
          setUserLocation(defaultCoords);
          setPickupCoords(defaultCoords);
        }
      );
    } else {
      // Silently use default location if geolocation not supported
      const defaultCoords = { lat: 30.0444, lng: 31.2357 };
      setUserLocation(defaultCoords);
      setPickupCoords(defaultCoords);
    }

    // Listen for ambulance acceptance
    if (socket) {
      socket.on('ambulanceAccepted', (data) => {
        const userId = getUserId();
        if (data.patientId === userId) {
          toast.success(`${data.message}`, {
            autoClose: 8000,
            position: 'top-center'
          });
          checkActiveRequest();
          setHasActiveRequest(true);
        }
      });

      socket.on('ambulanceStatusUpdate', (data) => {
        // Update ambulance location in real-time if they're assigned to this patient
        if (activeRequest && activeRequest.acceptedBy?._id === data.ambulanceId) {
          setAmbulanceTracking(prev => ({
            ...prev,
            currentLocation: data.location,
            eta: data.eta
          }));
        }
      });

      socket.on('patientArrived', (data) => {
        const userId = getUserId();
        if (data.patientId === userId) {
          setHasActiveRequest(false);
          setActiveRequest(null);
          setAmbulanceTracking(null);
          toast.success('You have arrived. You can request an ambulance again if needed.');
        }
      });

      socket.on('pickupRequestCancelled', (data) => {
        const userId = getUserId();
        if (data.patientId === userId) {
          setHasActiveRequest(false);
          setActiveRequest(null);
          toast.info('Your ambulance request was cancelled');
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('ambulanceAccepted');
        socket.off('ambulanceStatusUpdate');
        socket.off('patientArrived');
        socket.off('pickupRequestCancelled');
      }
    };
  }, []);

  const loadPatientData = async () => {
    try {
      const userId = getUserId();
      const response = await showUserDetails(userId);
      setPatientData(response.data.user);
    } catch (error) {
      console.error('Error loading patient data:', error);
      toast.error('Failed to load your details');
    }
  };

  const checkActiveRequest = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/ambulance/my-request`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        setHasActiveRequest(true);
        setActiveRequest(data.data);
        
        if (data.data.acceptedBy) {
          setAmbulanceTracking({
            ambulanceId: data.data.acceptedBy._id,
            ambulanceName: `${data.data.acceptedBy.firstName} ${data.data.acceptedBy.lastName}`,
            currentLocation: data.data.acceptedBy.currentLocation,
          });
        }
      } else {
        setHasActiveRequest(false);
        setActiveRequest(null);
      }
    } catch (error) {
      console.error('Error checking active request:', error);
    }
  };

  const handleMapClick = (latlng) => {
    setPickupCoords(latlng);
    toast.info(`Pickup location updated to: ${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();

    if (!pickupCoords) {
      toast.error('Please select a pickup location on the map');
      return;
    }

    if (!patientData?.reservedICU) {
      toast.error('You must have an ICU reservation before requesting an ambulance');
      return;
    }

    setLoading(true);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/ambulance/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pickupLocation: pickupLocation || `${pickupCoords.lat.toFixed(4)}, ${pickupCoords.lng.toFixed(4)}`,
          pickupCoordinates: {
            type: 'Point',
            coordinates: [pickupCoords.lng, pickupCoords.lat] // MongoDB expects [lng, lat]
          },
          urgency,
          notes
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create ambulance request');
      }

      toast.success('Ambulance request sent. Waiting for a crew to accept...');
      setHasActiveRequest(true);
      setActiveRequest(data.data);
      
      // Reset form
      setPickupLocation('');
      setNotes('');
      setUrgency('normal');
    } catch (error) {
      console.error('Error creating ambulance request:', error);
      toast.error(error.message || 'Failed to send ambulance request');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!activeRequest) return;

    const confirmCancel = window.confirm('Are you sure you want to cancel your ambulance request?');
    if (!confirmCancel) return;

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/ambulance/requests/${activeRequest._id}/cancel`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel request');
      }

      toast.success('Ambulance request cancelled');
      setHasActiveRequest(false);
      setActiveRequest(null);
      setAmbulanceTracking(null);
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error(error.message || 'Failed to cancel request');
    }
  };

  if (!userLocation) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <p>Getting your location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Request Ambulance Pickup</h1>
        <p>Select your pickup location and request an ambulance</p>
      </header>

      {hasActiveRequest && activeRequest ? (
        <section className={styles.activeRequest}>
          <h2>Active Ambulance Request</h2>
          
          <div className={styles.requestDetails}>
            <div className={styles.statusBadge} data-status={activeRequest.status}>
              {activeRequest.status.toUpperCase()}
            </div>
            
            <div className={styles.detailRow}>
              <strong>Pickup Location:</strong> {activeRequest.pickupLocation}
            </div>
            <div className={styles.detailRow}>
              <strong>Hospital:</strong> {activeRequest.hospital?.name}
            </div>
            <div className={styles.detailRow}>
              <strong>Urgency:</strong> {activeRequest.urgency.toUpperCase()}
            </div>
            <div className={styles.detailRow}>
              <strong>Requested:</strong> {new Date(activeRequest.createdAt).toLocaleString()}
            </div>

            {ambulanceTracking &&
              (activeRequest.status === 'accepted' || activeRequest.status === 'in_transit') &&
              activeRequest.acceptedBy && (
                <div className={styles.ambulanceInfo}>
                  <h3>Ambulance En Route</h3>
                  <div className={styles.detailRow}>
                    <strong>Crew:</strong> {ambulanceTracking.ambulanceName}
                  </div>
                  {ambulanceTracking.eta && (
                    <div className={styles.detailRow}>
                      <strong>ETA:</strong> {ambulanceTracking.eta} minutes
                    </div>
                  )}
                  {distanceKm != null && (
                    <div className={styles.detailRow}>
                      <strong>Distance:</strong> I'm {distanceKm.toFixed(1)} km away
                    </div>
                  )}
                  {etaMinutes != null && (
                    <div className={styles.detailRow}>
                      <strong>ETA (route):</strong> {Math.max(1, Math.round(etaMinutes))} minutes
                    </div>
                  )}
                </div>
            )}

            {activeRequest.status === 'pending' && (
              <Button variant="danger" onClick={handleCancelRequest} style={{ marginTop: '20px' }}>
                Cancel Request
              </Button>
            )}
          </div>

          {/* Live tracking map */}
          {ambulanceTracking && ambulanceTracking.currentLocation && (
            <div className={styles.trackingMap}>
              <h3>Live Ambulance Location</h3>
              <MapContainer
                center={[pickupCoords.lat, pickupCoords.lng]}
                zoom={13}
                style={{ height: '400px', width: '100%', borderRadius: '8px' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {routeCoords.length > 0 && (
                  <Polyline
                    positions={routeCoords}
                    pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.75 }}
                  />
                )}
                
                {/* Patient pickup location */}
                <Marker position={[pickupCoords.lat, pickupCoords.lng]}>
                  <Popup>
                    <strong>Your Pickup Location</strong>
                  </Popup>
                </Marker>

                {/* Ambulance current location */}
                {ambulanceTracking.currentLocation?.coordinates && (
                  <Marker 
                    position={[
                      ambulanceTracking.currentLocation.coordinates[1],
                      ambulanceTracking.currentLocation.coordinates[0]
                    ]}
                    icon={L.icon({
                      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                      iconSize: [25, 41],
                      iconAnchor: [12, 41],
                    })}
                  >
                    <Popup>
                      <strong>{ambulanceTracking.ambulanceName}</strong>
                      <br />
                      En route to you
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          )}
        </section>
      ) : (
        <section className={styles.requestForm}>
          <form onSubmit={handleSubmitRequest}>
            <div className={styles.formGroup}>
              <label htmlFor="pickupLocation">Pickup Address (Optional)</label>
              <SecureInput
                type="text"
                id="pickupLocation"
                name="pickupLocation"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                placeholder="e.g., 123 Main St, Cairo"
                maxLength={500}
              />
              <small>Or click on the map below to set your pickup location</small>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="urgency">Urgency Level</label>
              <SecureSelect
                id="urgency"
                name="urgency"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                options={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'urgent', label: 'Urgent' },
                  { value: 'critical', label: 'Critical' }
                ]}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="notes">Additional Notes (Optional)</label>
              <SecureTextarea
                id="notes"
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions or medical conditions..."
                rows={3}
                maxLength={1000}
              />
            </div>

            <div className={styles.mapContainer}>
              <h3>Select Pickup Location on Map</h3>
              <p>Click anywhere on the map to set your pickup location</p>
              <MapContainer
                center={[userLocation.lat, userLocation.lng]}
                zoom={13}
                style={{ height: '400px', width: '100%', borderRadius: '8px' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <LocationPicker onLocationSelect={handleMapClick} />
                
                {pickupCoords && (
                  <Marker position={[pickupCoords.lat, pickupCoords.lng]}>
                    <Popup>
                      <strong>Your Pickup Location</strong>
                      <br />
                      Lat: {pickupCoords.lat.toFixed(4)}
                      <br />
                      Lng: {pickupCoords.lng.toFixed(4)}
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
              {pickupCoords && (
                <p className={styles.coordsDisplay}>
                  Selected: {pickupCoords.lat.toFixed(4)}, {pickupCoords.lng.toFixed(4)}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="success"
              disabled={loading || !pickupCoords || !patientData?.reservedICU}
              style={{ width: '100%', marginTop: '20px' }}
            >
              {loading ? 'Sending Request...' : 'Request Ambulance'}
            </Button>

            {!patientData?.reservedICU && (
              <p className={styles.warning}>
                You must have an ICU reservation before requesting an ambulance.
              </p>
            )}
          </form>
        </section>
      )}
    </div>
  );
};

export default RequestAmbulance;
