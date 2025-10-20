import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import styles from "./Map.module.css";
import "leaflet/dist/leaflet.css";

function Map({ icus, latitude, longitude }) {
  if (!icus) return <p>Loading...</p>;

  console.log("Displaying ICUs on map:", icus);

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
          // Check if hospital.location is defined
          console.log(
            "this is the location of the icus",
            icu.hospital.location
          );
          if (
            icu.hospital &&
            icu.hospital.location &&
            icu.hospital.location.coordinates
          ) {
            return (
              <Marker
                key={icu._id}
                position={[
                  icu.hospital.location.coordinates[1], // latitude
                  icu.hospital.location.coordinates[0], // longitude
                ]}
              >
                <Popup>
                  <h3>{icu.hospital.name}</h3>
                  <p>Address: {icu.hospital.address}</p>
                  <p>Specialization: {icu.specialization}</p>
                </Popup>
              </Marker>
            );
          } else {
            console.warn(`ICU with ID ${icu._id} has an undefined location.`);
            return null; // Skip rendering if location is undefined
          }
        })}

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
