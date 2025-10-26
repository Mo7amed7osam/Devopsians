// src/pages/ICUSelect.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import MapComponent from '../components/Map.jsx';
import Icus from '../components/Icus.jsx';
import { fetchAvailableICUs, reserveICU } from '../utils/api';
import socket from '../utils/realtime'; 
import { getRole } from '../utils/cookieUtils';
import styles from './ICUSelect.module.css'; 
import Button from '../components/Button';

const ICUSelect = () => {
    const [userLocation, setUserLocation] = useState(null);
    const [hospitals, setHospitals] = useState([]);
    const [icus, setIcus] = useState([]);
    const [filters, setFilters] = useState({ specialization: '', searchTerm: '' });
    const [loading, setLoading] = useState(false);
    const userRole = getRole();

    // --- Data Fetching and Real-Time Updates ---
    useEffect(() => {
        // This block is updated to handle location denial gracefully.
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                // Success case: User allows location access
                (position) => {
                    setUserLocation({ 
                        lat: position.coords.latitude, 
                        lng: position.coords.longitude 
                    });
                },
                // Error case: User denies or fails to get location
                (err) => {
                    console.error("Geolocation failed:", err.message);
                    toast.warn("Could not get your location. Showing results for central Cairo.");
                    setUserLocation({ lat: 30.0444, lng: 31.2357 }); 
                }
            );
        } else {
            // Fallback for very old browsers that don't support geolocation
            toast.error("Geolocation is not supported by your browser. Showing results for central Cairo.");
            setUserLocation({ lat: 30.0444, lng: 31.2357 });
        }
    }, []);
    
    const loadICUs = useCallback(async () => {
        if (!userLocation) return;
        setLoading(true);
        try {
            // MOCK DATA for demonstration
            const mockData = {
                hospitals: [{ id: 'h1', name: 'Cairo General Hospital', location: { lat: 30.0444, lng: 31.2357 }, icus: 2 }],
                icus: [
                    { id: 'icu101', hospitalName: 'Cairo General Hospital', distance: '1.2 km', specialization: 'Cardiology', fee: '500 EGP/day' },
                    { id: 'icu102', hospitalName: 'Cairo General Hospital', distance: '1.2 km', specialization: 'Neurology', fee: '700 EGP/day' }
                ]
            };
            setHospitals(mockData.hospitals);
            setIcus(mockData.icus);
        } catch (err) {
            console.error("Failed to load ICU data:", err);
            toast.error('Failed to fetch ICU data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [userLocation, filters]);

    useEffect(() => {
        loadICUs();
    }, [loadICUs]);

    useEffect(() => {
        // Socket listeners for real-time updates...
    }, []);

    // --- Handlers ---
    const handleReserve = async (icuId) => {
        if (userRole !== 'patient') {
            toast.warn('Please log in as a patient to reserve an ICU.');
            return;
        }

        try {
            // await reserveICU(icuId); // Actual API call
            toast.success(`Successfully reserved ICU ${icuId}!`);
            
            // Optimistic UI update: remove the reserved ICU from the list
            setIcus(prevIcus => prevIcus.filter(icu => icu.id !== icuId));

        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Reservation failed. The ICU might have been taken.';
            toast.error(errorMessage);
        }
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    if (!userLocation) return <div className={styles.loadingState}>Attempting to find nearest ICUs...</div>;
    
    return (
        <div className={styles.finderPage}>
            <header className={styles.pageHeader}>
                <h1>Select Nearest Available ICU</h1>
                <p>Real-time availability using Leaflet. Log in to reserve.</p>
            </header>

            <div className={styles.controls}>
                <input 
                    type="text" 
                    name="searchTerm"
                    placeholder="Search by hospital name or location" 
                    value={filters.searchTerm} 
                    onChange={handleFilterChange}
                />
                <select name="specialization" value={filters.specialization} onChange={handleFilterChange}>
                    <option value="">All Specializations</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="General">General</option>
                </select>
                <Button onClick={loadICUs} disabled={loading} variant="primary">
                    {loading ? 'Searching...' : 'Search'}
                </Button>
            </div>

            <div className={styles.contentGrid}>
                <div className={styles.mapArea}>
                    <MapComponent hospitalsData={hospitals} userLocation={userLocation} />
                </div>
                
                <div className={styles.listArea}>
                    <h3>{icus.length} Available ICUs</h3>
                    <Icus icuList={icus} onReserve={handleReserve} loading={loading} />
                </div>
            </div>
        </div>
    );
};

export default ICUSelect;