// src/pages/ICUSelect.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { getAvailableICUsFromServer, fetchNearbyHospitalsPublic, reserveICUForPatient } from '../../utils/api';
import MapComponent from '../../components/patient/Map.jsx';
import Icus from '../../components/patient/Icus.jsx';
import { getUserId } from '../../utils/cookieUtils';
import socket from '../../utils/socket';
import styles from './ICUSelect.module.css'; 
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const ICUSelect = () => {
    const navigate = useNavigate();
    const [userLocation, setUserLocation] = useState(null);
    const [icus, setIcus] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [filters, setFilters] = useState({ specialization: '', searchTerm: '' });
    const [loading, setLoading] = useState(false);
    const [showPickupModal, setShowPickupModal] = useState(false);
    const [selectedIcuId, setSelectedIcuId] = useState(null);
    const [needsPickup, setNeedsPickup] = useState(false);
    const [pickupLocation, setPickupLocation] = useState('');

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
        if (userLocation) {
            loadICUs();
            loadNearbyHospitals();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userLocation]);

    // Listen for socket events for ambulance assignment notifications
    useEffect(() => {
        const userId = getUserId();
        
        if (socket && userId) {
            socket.on('patientNotification', (data) => {
                console.log('🔔 ICU Select - Patient notification received:', data);
                if (data.patientId === userId) {
                    if (data.type === 'ambulance_assigned') {
                        toast.success(`🚑 ${data.message}`, {
                            autoClose: 8000,
                            position: "top-center"
                        });
                    } else if (data.type === 'pickup_request_sent') {
                        toast.info(`🚑 ${data.message}`, {
                            autoClose: 8000,
                            position: "top-center"
                        });
                    } else if (data.type === 'ambulance_accepted') {
                        toast.success(`🚑 ${data.message}`, {
                            autoClose: 8000,
                            position: "top-center"
                        });
                    }
                }
            });
        }

        return () => {
            if (socket) {
                socket.off('patientNotification');
            }
        };
    }, []);

    // --- Handle ICU Reservation ---
    const handleReserve = async (icuId) => {
        console.log('🔵 Reserve button clicked for ICU:', icuId);
        const userId = getUserId();
        console.log('🔵 User ID:', userId);
        
        if (!userId) {
            toast.error('Please log in to reserve an ICU.');
            return;
        }

        // Show modal to ask about pickup
        console.log('🔵 Opening pickup modal...');
        setSelectedIcuId(icuId);
        setShowPickupModal(true);
    };

    const handleConfirmReservation = async () => {
        console.log('🟢 Confirm reservation clicked');
        console.log('🟢 Selected ICU ID:', selectedIcuId);
        console.log('🟢 Needs pickup:', needsPickup);
        console.log('🟢 Pickup location:', pickupLocation);
        
        if (needsPickup && !pickupLocation.trim()) {
            toast.warn('Please enter your pickup location');
            return;
        }

        try {
            const userId = getUserId();
            console.log('🟢 User ID for reservation:', userId);
            setLoading(true);
            
            const payload = {
                icuId: selectedIcuId,
                userId,
                needsPickup,
                pickupLocation: needsPickup ? pickupLocation : null
            };
            console.log('🟢 Sending payload:', payload);
            
            // Call backend API to reserve ICU with pickup info
            const response = await reserveICUForPatient(payload);
            console.log('🟢 Reservation response:', response.data);
            
            if (needsPickup && response.data?.ambulanceAssigned) {
                toast.success('🚑 ICU reserved! Ambulance is on the way to your location. Waiting for crew approval...', {
                    autoClose: 5000
                });
            } else if (needsPickup) {
                toast.warn('⚠️ ICU reserved but no ambulance is currently available. Please try to arrange transportation.', {
                    autoClose: 5000
                });
            } else {
                toast.success('✅ ICU reserved! Please proceed to the hospital. The receptionist will check you in upon arrival.', {
                    autoClose: 5000
                });
            }
            
            setShowPickupModal(false);
            
            // Redirect to patient homepage
            setTimeout(() => {
                navigate('/patient');
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

            {/* Pickup Request Modal */}
            <Modal isOpen={showPickupModal} onClose={() => setShowPickupModal(false)}>
                <div style={{ padding: '1.5rem' }}>
                    <h2 style={{ marginBottom: '1rem' }}>Complete Your Reservation</h2>
                        
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                Do you need ambulance pickup?
                            </label>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '10px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input 
                                        type="radio" 
                                        name="pickup" 
                                        value="yes"
                                        checked={needsPickup === true}
                                        onChange={() => setNeedsPickup(true)}
                                        style={{ marginRight: '0.5rem' }}
                                    />
                                    Yes, I need ambulance pickup
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input 
                                        type="radio" 
                                        name="pickup" 
                                        value="no"
                                        checked={needsPickup === false}
                                        onChange={() => setNeedsPickup(false)}
                                        style={{ marginRight: '0.5rem' }}
                                    />
                                    No, I will come directly
                                </label>
                            </div>
                        </div>

                        {needsPickup && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                    Your Current Location/Address
                                </label>
                                <input 
                                    type="text"
                                    value={pickupLocation}
                                    onChange={(e) => setPickupLocation(e.target.value)}
                                    placeholder="Enter your current address for pickup"
                                    style={{ 
                                        width: '100%', 
                                        padding: '10px', 
                                        border: '1px solid #ccc', 
                                        borderRadius: '4px',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <Button 
                                variant="secondary"
                                onClick={() => setShowPickupModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button 
                                variant="primary"
                                onClick={handleConfirmReservation}
                                disabled={loading}
                            >
                                {loading ? 'Reserving...' : 'Confirm Reservation'}
                            </Button>
                        </div>
                    </div>
                </Modal>
        </div>
    );
};

export default ICUSelect;