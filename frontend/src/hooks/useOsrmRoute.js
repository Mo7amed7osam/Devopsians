import { useEffect, useState } from "react";

const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";

const isValidPoint = (point) => {
  return (
    point &&
    typeof point.lat === "number" &&
    typeof point.lng === "number" &&
    !Number.isNaN(point.lat) &&
    !Number.isNaN(point.lng)
  );
};

const useOsrmRoute = ({ from, to, enabled = true }) => {
  const [routeCoords, setRouteCoords] = useState([]);
  const [distanceKm, setDistanceKm] = useState(null);
  const [etaMinutes, setEtaMinutes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !isValidPoint(from) || !isValidPoint(to)) {
      setRouteCoords([]);
      setDistanceKm(null);
      setEtaMinutes(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const fetchRoute = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `${OSRM_BASE_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`OSRM request failed with status ${res.status}`);
        }
        const data = await res.json();
        const route = data?.routes?.[0];
        const geometry = route?.geometry?.coordinates;
        const coords = Array.isArray(geometry)
          ? geometry.map(([lng, lat]) => [lat, lng])
          : [];

        setRouteCoords(coords);
        setDistanceKm(typeof route?.distance === "number" ? route.distance / 1000 : null);
        setEtaMinutes(typeof route?.duration === "number" ? route.duration / 60 : null);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err);
          setRouteCoords([]);
          setDistanceKm(null);
          setEtaMinutes(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
    return () => controller.abort();
  }, [from?.lat, from?.lng, to?.lat, to?.lng, enabled]);

  return { routeCoords, distanceKm, etaMinutes, loading, error };
};

export default useOsrmRoute;
