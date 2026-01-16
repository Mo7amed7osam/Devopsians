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
import usePatientLocale from '../../hooks/usePatientLocale';

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
  const { t, dir, locale, setLocale } = usePatientLocale();
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
  const [lastTrackingUpdatedAt, setLastTrackingUpdatedAt] = useState(null);

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

  const formatLastUpdated = () => {
    if (!lastTrackingUpdatedAt) return t('common.justNow');
    const diffMs = Date.now() - lastTrackingUpdatedAt.getTime();
    const diffMin = Math.max(0, Math.round(diffMs / 60000));
    if (diffMin <= 1) return t('common.justNow');
    return t('common.minutesAgo', { count: diffMin });
  };

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
          setLastTrackingUpdatedAt(new Date());
        }
      });

      socket.on('patientArrived', (data) => {
        const userId = getUserId();
        if (data.patientId === userId) {
          setHasActiveRequest(false);
          setActiveRequest(null);
          setAmbulanceTracking(null);
          toast.success(t('ambulance.toastArrivedAgain'));
        }
      });

      socket.on('pickupRequestCancelled', (data) => {
        const userId = getUserId();
        if (data.patientId === userId) {
          setHasActiveRequest(false);
          setActiveRequest(null);
          toast.info(t('ambulance.toastCancelled'));
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
      toast.error(t('ambulance.toastLoadDetailsFailed'));
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
          setLastTrackingUpdatedAt(new Date());
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
    toast.info(
      t('ambulance.toastPickupUpdated', {
        lat: latlng.lat.toFixed(4),
        lng: latlng.lng.toFixed(4),
      })
    );
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();

    if (!pickupCoords) {
      toast.error(t('ambulance.toastSelectPickup'));
      return;
    }

    if (!patientData?.reservedICU) {
      toast.error(t('ambulance.toastNeedReservation'));
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

      toast.success(t('ambulance.toastRequestSent'));
      setHasActiveRequest(true);
      setActiveRequest(data.data);
      
      // Reset form
      setPickupLocation('');
      setNotes('');
      setUrgency('normal');
    } catch (error) {
      console.error('Error creating ambulance request:', error);
      toast.error(error.message || t('ambulance.toastRequestFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!activeRequest) return;

    const confirmCancel = window.confirm(t('ambulance.toastCancelConfirm'));
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

      toast.success(t('ambulance.toastCancelSuccess'));
      setHasActiveRequest(false);
      setActiveRequest(null);
      setAmbulanceTracking(null);
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error(error.message || t('ambulance.toastCancelFailed'));
    }
  };

  if (!userLocation) {
    return (
      <div className={styles.container} dir={dir} lang={locale}>
        <div className={styles.loading}>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} dir={dir} lang={locale}>
      <header className={styles.header}>
        <div className={styles.localeToggle}>
          <button
            type="button"
            className={`${styles.localeButton} ${locale === 'en' ? styles.localeActive : ''}`}
            onClick={() => setLocale('en')}
          >
            {t('lang.english')}
          </button>
          <button
            type="button"
            className={`${styles.localeButton} ${locale === 'ar' ? styles.localeActive : ''}`}
            onClick={() => setLocale('ar')}
          >
            {t('lang.arabic')}
          </button>
        </div>
        <h1>{t('ambulance.title')}</h1>
        <p>{t('ambulance.subtitle')}</p>
      </header>

      {hasActiveRequest && activeRequest ? (
        <section className={styles.activeRequest}>
          <h2>{t('ambulance.activeRequest')}</h2>
          
          <div className={styles.requestDetails}>
            <div className={styles.statusBadge} data-status={activeRequest.status}>
              {activeRequest.status.toUpperCase()}
            </div>
            
            <div className={styles.detailRow}>
              <strong>{t('ambulance.pickupLocation')}:</strong> {activeRequest.pickupLocation}
            </div>
            <div className={styles.detailRow}>
              <strong>{t('ambulance.hospital')}:</strong> {activeRequest.hospital?.name}
            </div>
            <div className={styles.detailRow}>
              <strong>{t('ambulance.urgency')}:</strong> {activeRequest.urgency.toUpperCase()}
            </div>
            <div className={styles.detailRow}>
              <strong>{t('ambulance.requested')}:</strong> {new Date(activeRequest.createdAt).toLocaleString()}
            </div>

            {ambulanceTracking &&
              (activeRequest.status === 'accepted' || activeRequest.status === 'in_transit') &&
              activeRequest.acceptedBy && (
                <div className={styles.ambulanceInfo}>
                  <h3>{t('ambulance.enRoute')}</h3>
                  <div className={styles.detailRow}>
                    <strong>{t('ambulance.crew')}:</strong> {ambulanceTracking.ambulanceName}
                  </div>
                  {ambulanceTracking.eta && (
                    <div className={styles.detailRow}>
                      <strong>{t('ambulance.eta')}:</strong> {ambulanceTracking.eta} {t('common.minutesLabel')}
                    </div>
                  )}
                  {distanceKm != null && (
                    <div className={styles.detailRow}>
                      <strong>{t('ambulance.distance')}:</strong> {t('ambulance.imAway', { distance: distanceKm.toFixed(1) })}
                    </div>
                  )}
                  {etaMinutes != null && (
                    <div className={styles.detailRow}>
                      <strong>{t('ambulance.etaRoute')}:</strong> {Math.max(1, Math.round(etaMinutes))} {t('common.minutesLabel')}
                    </div>
                  )}
                  {lastTrackingUpdatedAt && (
                    <div className={styles.detailRow}>
                      <strong>{t('common.lastUpdated', { time: formatLastUpdated() })}</strong>
                    </div>
                  )}
                </div>
            )}

            {activeRequest.status === 'pending' && (
              <Button variant="danger" onClick={handleCancelRequest} style={{ marginTop: '20px' }}>
                {t('ambulance.cancelRequest')}
              </Button>
            )}
          </div>

          {/* Live tracking map */}
          {ambulanceTracking && ambulanceTracking.currentLocation && (
            <div className={styles.trackingMap}>
              <h3>{t('ambulance.liveMap')}</h3>
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
                    <strong>{t('ambulance.pickupLocation')}</strong>
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
                      {t('ambulance.enRoute')}
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
              <label htmlFor="pickupLocation">{t('ambulance.pickupAddress', { optional: t('common.optional') })}</label>
              <SecureInput
                type="text"
                id="pickupLocation"
                name="pickupLocation"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                placeholder={t('icu.pickupAddressPlaceholder')}
                maxLength={500}
              />
              <small>{t('ambulance.pickupHint')}</small>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="urgency">{t('ambulance.urgencyLevel')}</label>
              <SecureSelect
                id="urgency"
                name="urgency"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                options={[
                  { value: 'normal', label: t('ambulance.urgencyNormal') },
                  { value: 'urgent', label: t('ambulance.urgencyUrgent') },
                  { value: 'critical', label: t('ambulance.urgencyCritical') }
                ]}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="notes">{t('ambulance.notesLabel', { optional: t('common.optional') })}</label>
              <SecureTextarea
                id="notes"
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('ambulance.notesPlaceholder')}
                rows={3}
                maxLength={1000}
              />
            </div>

            <div className={styles.mapContainer}>
              <h3>{t('ambulance.selectPickupOnMap')}</h3>
              <p>{t('ambulance.clickMapHint')}</p>
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
                      <strong>{t('ambulance.pickupLocation')}</strong>
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
                  {t('ambulance.selected', {
                    lat: pickupCoords.lat.toFixed(4),
                    lng: pickupCoords.lng.toFixed(4),
                  })}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="success"
              disabled={loading || !pickupCoords || !patientData?.reservedICU}
              style={{ width: '100%', marginTop: '20px' }}
            >
              {loading ? t('ambulance.sending') : t('ambulance.requestPickup')}
            </Button>

            {!patientData?.reservedICU && (
              <p className={styles.warning}>
                {t('ambulance.toastNeedReservation')}
              </p>
            )}
          </form>
        </section>
      )}
    </div>
  );
};

export default RequestAmbulance;
