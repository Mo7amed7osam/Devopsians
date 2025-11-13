// src/pages/ICUSelect.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { getAvailableICUsFromServer } from '../../utils/api';
import MapComponent from '../../components/patient/Map.jsx';
import Icus from '../../components/patient/Icus.jsx';
import { getUserId } from '../../utils/cookieUtils';
import styles from './ICUSelect.module.css'; 
import Button from '../../components/common/Button';

const API_BASE = 'http://localhost:3030';

const ICUSelect = () => {
    const [userLocation, setUserLocation] = useState(null);
    const [icus, setIcus] = useState([]);
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
    
    // --- Load ICUs from Backend ---
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

    useEffect(() => {
        loadICUs();
    }, [loadICUs]);

    // --- Handle ICU Reservation ---
    const handleReserve = async (icuId) => {
        try {
            const userId = getUserId();
            if (!userId) {
                toast.error('Please log in to reserve an ICU.');
                return;
            }

            setLoading(true);
            
            // Call backend API to reserve ICU
            await axios.post(`${API_BASE}/icu/reserve`, {
                icuId,
                patientId: userId
            });
            
            toast.success('Successfully reserved ICU! Refreshing dashboard...');
            
            // Refresh the page to show the patient dashboard with reserved ICU
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
                    <option value="Cardiac ICU">Cardiac ICU</option>
                    <option value="Neurological ICU">Neurological ICU</option>
                    <option value="Pediatric ICU">Pediatric ICU</option>
                    <option value="Medical ICU">Medical ICU</option>
                    <option value="Surgical ICU">Surgical ICU</option>
                </select>
                <Button onClick={loadICUs} disabled={loading} variant="primary">
                    {loading ? 'Searching...' : 'Refresh'}
                </Button>
            </div>

            <div className={styles.contentGrid}>
                <div className={styles.mapArea}>
                    <MapComponent 
                        icus={icus} 
                        latitude={userLocation.lat} 
                        longitude={userLocation.lng} 
                    />
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