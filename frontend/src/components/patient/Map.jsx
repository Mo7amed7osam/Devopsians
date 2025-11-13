import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
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

function Map({ icus, hospitals = [], latitude, longitude }) {
  if (!icus) return <p>Loading...</p>;

  console.log("Displaying ICUs on map:", icus);
  console.log("Displaying hospitals on map:", hospitals);

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

        {/* Render ICU Markers (Blue) */}
        {icus.map((icu) => {
          // Safely read hospital location using optional chaining
          const hospitalLocation = icu?.hospital?.location?.coordinates;
          if (hospitalLocation && hospitalLocation.length === 2) {
            const icuLng = hospitalLocation[0];
            const icuLat = hospitalLocation[1];
            return (
              <Marker
                key={icu._id}
                position={[icuLat, icuLng]}
                icon={icuIcon}
              >
                <Popup>
                  <h3>{icu.hospital?.name || 'Unknown Hospital'}</h3>
                  <p><strong>Address:</strong> {icu.hospital?.address || 'N/A'}</p>
                  <p><strong>Specialization:</strong> {icu.specialization}</p>
                  <p><strong>Room:</strong> {icu.room}</p>
                  <p><strong>Fee:</strong> {icu.fees} EGP/day</p>
                  {latitude != null && longitude != null && (
                    <p><strong>Distance:</strong> {Math.round(distanceMeters(latitude, longitude, icuLat, icuLng))} m</p>
                  )}
                </Popup>
              </Marker>
            );
          }

          console.warn(`ICU with ID ${icu._id} has an undefined location; skipping marker.`);
          return null;
        })}

        {/* User location marker */}
        {latitude != null && longitude != null && (
          <Marker position={[latitude, longitude]}>
            <Popup>📍 You are here</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

export default Map;
