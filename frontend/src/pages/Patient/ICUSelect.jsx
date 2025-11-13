// src/pages/ICUSelect.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getAvailableICUsFromServer, fetchNearbyHospitalsPublic, reserveICUOnServer } from '../../utils/api';
import MapComponent from '../../components/patient/Map.jsx';
import Icus from '../../components/patient/Icus.jsx';
import { getUserId } from '../../utils/cookieUtils';
import styles from './ICUSelect.module.css'; 
import Button from '../../components/common/Button';

const ICUSelect = () => {
    const [userLocation, setUserLocation] = useState(null);
    const [icus, setIcus] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [filters, setFilters] = useState({ specialization: '', searchTerm: '' });
    const [loading, setLoading] = useState(false);

    // --- Get User Location ---
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({ 
                        lat: position.coords.latitude, 
                        lng: position.coords.longitude 
                    });
                },
                (err) => {
                    console.error("Geolocation failed:", err.message);
                    toast.warn("Could not get your location. Showing results for Cairo.");
                    setUserLocation({ lat: 30.0444, lng: 31.2357 }); 
                }
            );
        } else {
            toast.error("Geolocation is not supported. Showing results for Cairo.");
            setUserLocation({ lat: 30.0444, lng: 31.2357 });
        }
    }, []);
    
    // --- Load ICUs and Hospitals from Backend ---
    const loadICUs = useCallback(async () => {
        if (!userLocation) return;
        setLoading(true);
        try {
            // Fetch available ICUs from backend (public endpoint)
            const response = await getAvailableICUsFromServer();
            const allIcus = Array.isArray(response.data) ? response.data : response.data?.icus || response.data?.icusList || [];

            // Filter available ICUs only (controller already returns available, but keep guard)
            const availableIcus = allIcus.filter(icu => icu && (icu.status || '').toString().toLowerCase() === 'available' && !icu.isReserved);

            setIcus(availableIcus);

            if (availableIcus.length === 0) {
                toast.info('No available ICUs at the moment. Please try again later.');
            }
        } catch (err) {
            console.error("Failed to load ICU data:", err);
            toast.error('Failed to fetch ICU data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [userLocation]);

    // --- Load Nearby Hospitals (Public API - no auth required) ---
    const loadNearbyHospitals = useCallback(async () => {
        if (!userLocation) return;
        try {
            const response = await fetchNearbyHospitalsPublic(userLocation.lat, userLocation.lng, 50000); // 50km radius
            const hospitalList = response.data?.hospitals || [];
            setHospitals(hospitalList);
        } catch (err) {
            console.error("Failed to load nearby hospitals:", err);
            // Don't show error toast - this is optional feature for map display
        }
    }, [userLocation]);

    useEffect(() => {
        loadICUs();
        loadNearbyHospitals();
    }, [loadICUs, loadNearbyHospitals]);

    // --- Handle ICU Reservation ---
    const handleReserve = async (icuId) => {
        try {
            const userId = getUserId();
            if (!userId) {
                toast.error('Please log in to reserve an ICU.');
                return;
            }

            setLoading(true);
            
            // Call backend API to reserve ICU using authenticated API instance
            await reserveICUOnServer({
                icuId,
                patientId: userId
            });
            
            toast.success('ICU reservation submitted! Waiting for receptionist approval...');
            
            // Refresh the page to show waiting status
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (err) {
            console.error('Reservation error:', err);
            const errorMessage = err.response?.data?.message || 'Reservation failed. Please try again.';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    // Apply filters to ICU list
    const filteredIcus = icus.filter(icu => {
        // Filter by specialization
        if (filters.specialization && icu.specialization !== filters.specialization) {
            return false;
        }
        
        // Filter by hospital name (search term)
        if (filters.searchTerm) {
            const hospitalName = (icu.hospital?.name || '').toLowerCase();
            const searchLower = filters.searchTerm.toLowerCase();
            if (!hospitalName.includes(searchLower)) {
                return false;
            }
        }
        
        return true;
    });

    if (!userLocation) return <div className={styles.loadingState}>Finding your location...</div>;
    
    return (
        <div className={styles.finderPage}>
            <header className={styles.pageHeader}>
                <h1>Select Nearest Available ICU</h1>
                <p>Real-time availability. Click Reserve to book your ICU.</p>
            </header>

            <div className={styles.controls}>
                <input 
                    type="text" 
                    name="searchTerm"
                    placeholder="Search by hospital name" 
                    value={filters.searchTerm} 
                    onChange={handleFilterChange}
                />
                <select name="specialization" value={filters.specialization} onChange={handleFilterChange}>
                    <option value="">All Specializations</option>
                    <option value="Surgical ICU">Surgical ICU</option>
                    <option value="Cardiac ICU">Cardiac ICU</option>
                    <option value="Neonatal ICU">Neonatal ICU</option>
                    <option value="Pediatric ICU">Pediatric ICU</option>
                    <option value="Neurological ICU">Neurological ICU</option>
                </select>
                <Button onClick={() => { loadICUs(); loadNearbyHospitals(); }} disabled={loading} variant="primary">
                    {loading ? 'Searching...' : 'Refresh'}
                </Button>
            </div>

            <div className={styles.contentGrid}>
                <div className={styles.mapArea}>
                    <MapComponent 
                        icus={filteredIcus}
                        hospitals={hospitals}
                        latitude={userLocation.lat} 
                        longitude={userLocation.lng} 
                    />
                </div>
                
                <div className={styles.listArea}>
                    <h3>{filteredIcus.length} Available ICUs</h3>
                    <Icus icuList={filteredIcus} onReserve={handleReserve} loading={loading} />
                </div>
            </div>
        </div>
    );
};

export default ICUSelect;