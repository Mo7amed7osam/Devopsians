import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { useState } from "react";
import styles from "./Map.module.css";
import "leaflet/dist/leaflet.css";

// Custom icons for different marker types
const hospitalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const icuIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle "Go to My Location" button
function RecenterButton({ latitude, longitude }) {
  const map = useMap();
  
  const handleRecenter = () => {
    if (latitude != null && longitude != null) {
      map.flyTo([latitude, longitude], 15, {
        duration: 1.5
      });
    }
  };

  if (latitude == null || longitude == null) return null;

  return (
    <button
      onClick={handleRecenter}
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        padding: '10px 15px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '5px'
      }}
      onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
      onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
    >
      📍 My Location
    </button>
  );
}

function Map({ icus, hospitals = [], latitude, longitude }) {
  if (!icus) return <p>Loading...</p>;

  // Haversine formula to compute distance in meters between two lat/lon points
  const distanceMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // meters
  };

  return (
    <div className={styles.container}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={13}
        className={styles.map}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Render Hospital Markers (Red) */}
        {hospitals.map((hospital) => {
          const hospitalLocation = hospital?.location?.coordinates;
          if (hospitalLocation && hospitalLocation.length === 2) {
            const hospitalLng = hospitalLocation[0];
            const hospitalLat = hospitalLocation[1];
            const distance = hospital.distance || (latitude != null && longitude != null ? 
              Math.round(distanceMeters(latitude, longitude, hospitalLat, hospitalLng)) : null);
            
            return (
              <Marker
                key={hospital._id}
                position={[hospitalLat, hospitalLng]}
                icon={hospitalIcon}
              >
                <Popup>
                  <h3>{hospital.name || 'Unknown Hospital'}</h3>
                  <p><strong>Address:</strong> {hospital.address || 'N/A'}</p>
                  <p><strong>Contact:</strong> {hospital.contactNumber || 'N/A'}</p>
                  {distance && <p><strong>Distance:</strong> {distance} m</p>}
                </Popup>
              </Marker>
            );
          }
          return null;
        })}

        {/* Render ICU Markers (Blue) with Polylines */}
        {icus.map((icu) => {
          // Safely read hospital location using optional chaining
          const hospitalLocation = icu?.hospital?.location?.coordinates;
          if (hospitalLocation && hospitalLocation.length === 2) {
            const icuLng = hospitalLocation[0];
            const icuLat = hospitalLocation[1];
            const distance = latitude != null && longitude != null 
              ? Math.round(distanceMeters(latitude, longitude, icuLat, icuLng))
              : null;
            
            return (
              <React.Fragment key={icu._id}>
                {/* Polyline from user to ICU */}
                {latitude != null && longitude != null && (
                  <Polyline
                    positions={[
                      [latitude, longitude],
                      [icuLat, icuLng]
                    ]}
                    color="blue"
                    weight={2}
                    opacity={0.6}
                  >
                    <Tooltip permanent direction="center" className={styles.distanceTooltip}>
                      {distance} m
                    </Tooltip>
                  </Polyline>
                )}
                
                {/* ICU Marker */}
                <Marker
                  position={[icuLat, icuLng]}
                  icon={icuIcon}
                >
                  <Popup>
                    <h3>{icu.hospital?.name || 'Unknown Hospital'}</h3>
                    <p><strong>Address:</strong> {icu.hospital?.address || 'N/A'}</p>
                    <p><strong>Specialization:</strong> {icu.specialization}</p>
                    <p><strong>Room:</strong> {icu.room}</p>
                    <p><strong>Fee:</strong> {icu.fees} EGP/day</p>
                    {distance && (
                      <p><strong>Distance:</strong> {distance} m</p>
                    )}
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          }
          return null;
        })}

        {/* User location marker with green icon */}
        {latitude != null && longitude != null && (
          <Marker position={[latitude, longitude]} icon={userLocationIcon}>
            <Popup>
              <strong>📍 Your Location</strong>
              <br />
              Lat: {latitude.toFixed(4)}
              <br />
              Lng: {longitude.toFixed(4)}
            </Popup>
          </Marker>
        )}
        
        {/* Recenter button */}
        <RecenterButton latitude={latitude} longitude={longitude} />
      </MapContainer>
    </div>
  );
}

export default Map;
