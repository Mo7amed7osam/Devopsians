// // src/components/Map.jsx
// import React, { useEffect } from 'react';
// import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
// import 'leaflet/dist/leaflet.css';
// import styles from './Map.module.css';
// import L from 'leaflet';

// // 🛑 IMPORTANT: Fix for default Leaflet marker icons
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//     iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
//     iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
//     shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
// });

// // Helper component to recenter the map view when center changes
// const RecenterMap = ({ center, zoom }) => {
//   const map = useMap();
//   useEffect(() => {
//     // Check if the center coordinates are valid before setting the view
//     if (center && center.length === 2 && center[0] !== 0 && center[1] !== 0) {
//         map.setView(center, zoom, {
//             animate: true,
//             pan: { duration: 1 }
//         });
//     }
//   }, [center, zoom, map]);
//   return null;
// };

// // Custom icon for the user's current location (more visible than default)
// const userIcon = new L.Icon({ 
//     iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png', 
//     iconSize: [25, 41], iconAnchor: [12, 41] 
// });

// const hospitalIcon = new L.Icon.Default(); // Use default for hospitals

// // --- Main Map Component ---
// // hospitalsData: [{ id, name, specialization, lat, lng, availableICUs }]
// // userLocation: { lat, lng }
// const Map = ({ hospitalsData = [], userLocation, initialZoom = 13 }) => {
//   const defaultCenter = [30.033333, 31.233334]; // Cairo, Egypt 
//   const center = userLocation ? [userLocation.lat, userLocation.lng] : defaultCenter;
  
//   return (
//     <div className={styles.mapWrapper}>
//         <MapContainer 
//             center={center} 
//             zoom={initialZoom} 
//             scrollWheelZoom={true} 
//             className={styles.mapContainer}
//         >
//             <TileLayer
//                 attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//                 url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//             />
            
//             {/* Component to dynamically move the map */}
//             <RecenterMap center={center} zoom={initialZoom} />

//             {/* Render Hospital Markers */}
//             {hospitalsData.map(hospital => (
//                 <Marker key={hospital.id} position={[hospital.lat, hospital.lng]} icon={hospitalIcon}>
//                     <Popup>
//                         <div className={styles.hospitalPopup}>
//                             <h4>{hospital.name} ({hospital.specialization})</h4>
//                             <p>Available ICUs: <span className={hospital.availableICUs > 0 ? styles.available : styles.unavailable}>{hospital.availableICUs}</span></p>
//                             <button className={styles.reserveButton}>
//                                 View Details & Reserve
//                             </button>
//                         </div>
//                     </Popup>
//                 </Marker>
//             ))}

//             {/* Render User Location Marker */}
//             {userLocation && (
//                 <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
//                     <Popup>Your Location (Nearest ICU Search)</Popup>
//                 </Marker>
//             )}
//         </MapContainer>
//     </div>
//   );
// };

// export default Map;


// src/components/Map.jsx
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './Map.module.css';
import L from 'leaflet';

// IMPORTANT: Fix for default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Helper component to recenter the map view when center changes
const RecenterMap = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center.length === 2 && center[0] !== 0 && center[1] !== 0) {
        map.setView(center, zoom, {
            animate: true,
            pan: { duration: 1 }
        });
    }
  }, [center, zoom, map]);
  return null;
};

// Custom icon for the user's current location
const userIcon = new L.Icon({ 
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png', 
    iconSize: [25, 41], iconAnchor: [12, 41] 
});

const hospitalIcon = new L.Icon.Default();

// --- Main Map Component ---
const Map = ({ hospitalsData = [], userLocation, initialZoom = 13 }) => {
  const defaultCenter = [30.033333, 31.233334]; // Cairo, Egypt 
  const isValidUserLocation =
    userLocation &&
    typeof userLocation.lat === "number" &&
    typeof userLocation.lng === "number" &&
    !isNaN(userLocation.lat) &&
    !isNaN(userLocation.lng);

  const center = isValidUserLocation ? [userLocation.lat, userLocation.lng] : defaultCenter;

  // Prevents rendering a blank map while waiting for data
  if (!isValidUserLocation && !hospitalsData.length) {
    return <p style={{ textAlign: "center", marginTop: "2rem" }}>Loading map or waiting for location permission...</p>;
  }

  return (
    <div className={styles.mapWrapper}>
      <MapContainer
        center={center}
        zoom={initialZoom}
        scrollWheelZoom={true}
        className={styles.mapContainer}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterMap center={center} zoom={initialZoom} />

        {/* Render Hospital Markers safely */}
        {hospitalsData
          .filter(h => 
            // FIX: Check inside the 'location' object for valid data
            h.location && 
            typeof h.location.lat === "number" &&
            typeof h.location.lng === "number" &&
            !isNaN(h.location.lat) &&
            !isNaN(h.location.lng)
          )
          .map((hospital) => (
            <Marker
              key={hospital.id}
              // FIX: Access the data from the 'location' object
              position={[hospital.location.lat, hospital.location.lng]}
              icon={hospitalIcon}
            >
              <Popup>
                <div className={styles.hospitalPopup}>
                  <h4>{hospital.name}</h4>
                  {typeof hospital.icus === 'number' && (
                    <p>
                      Available ICUs:{" "}
                      <span
                        className={
                          hospital.icus > 0
                            ? styles.available
                            : styles.unavailable
                        }
                      >
                        {hospital.icus}
                      </span>
                    </p>
                  )}
                  <button className={styles.reserveButton}>
                    View Details & Reserve
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Render User Marker only if valid */}
        {isValidUserLocation && (
          <Marker position={center} icon={userIcon}>
            <Popup>Your Location</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default Map;