import { useEffect, useState, useRef } from 'react';
import { fetchLiveLocations } from './api';

// Generic hook to poll live user locations every 5 seconds.
// Returns { locations, loading, error }.
export default function useLiveLocations(autoStart = true, intervalMs = 5000) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(autoStart);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const load = async () => {
    try {
      const res = await fetchLiveLocations();
      const data = res?.data?.users || [];
      setLocations(data);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    }
  };

  useEffect(() => {
    if (!autoStart) return;
    load().finally(() => setLoading(false));
    timerRef.current = setInterval(load, intervalMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoStart, intervalMs]);

  return { locations, loading, error, reload: load };
}
