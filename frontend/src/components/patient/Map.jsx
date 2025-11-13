import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip } from "react-leaflet";
import styles from "./Map.module.css";
import "leaflet/dist/leaflet.css";

function Map({ icus, latitude, longitude }) {
  if (!icus) return <p>Loading...</p>;

  console.log("Displaying ICUs on map:", icus);

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
        zoom={15}
        className={styles.map}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {icus.map((icu) => {
          // Safely read hospital location using optional chaining
          const hospitalLocation = icu?.hospital?.location?.coordinates;
          if (hospitalLocation && hospitalLocation.length === 2) {
            const icuLng = hospitalLocation[0];
            const icuLat = hospitalLocation[1];
            return (
              <Marker
                key={icu._id}
                position={[icuLat, icuLng]} // [lat, lng]
              >
                <Popup>
                  <h3>{icu.hospital?.name || 'Unknown Hospital'}</h3>
                  <p>Address: {icu.hospital?.address || 'N/A'}</p>
                  <p>Specialization: {icu.specialization}</p>
                  {latitude != null && longitude != null && (
                    <p>Distance: {Math.round(distanceMeters(latitude, longitude, icuLat, icuLng))} m</p>
                  )}
                </Popup>
              </Marker>
            );
          }

          console.warn(`ICU with ID ${icu._id} has an undefined location; skipping marker.`);
          return null;
        })}

        {/* Render polyline arrows from user location to each ICU that has coordinates */}
        {icus.map((icu) => {
          const hospitalLocation = icu?.hospital?.location?.coordinates;
          if (hospitalLocation && hospitalLocation.length === 2 && latitude != null && longitude != null) {
            const icuLat = hospitalLocation[1];
            const icuLng = hospitalLocation[0];
            const points = [
              [latitude, longitude],
              [icuLat, icuLng],
            ];
            const meters = Math.round(distanceMeters(latitude, longitude, icuLat, icuLng));
            return (
              <Polyline
                key={`line-${icu._id}`}
                positions={points}
                pathOptions={{ color: '#2b8cbe', weight: 2, dashArray: '4 6' }}
              >
                <Tooltip direction="center" permanent>
                  {meters} m
                </Tooltip>
              </Polyline>
            );
          }
          return null;
        })}

        {/* User location marker */}
        {latitude != null && longitude != null && (
          <Marker position={[latitude, longitude]}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {/* <Marker
          position={[
            longitude,
            latitude, // latitude
          ]}
        >
          <Popup>
            <h3>{}</h3>
            <p>Address: {icu.hospital.address}</p>
            <p>Specialization: {icu.specialization}</p>
          </Popup>
        </Marker> */}
      </MapContainer>
    </div>
  );
}

export default Map;
