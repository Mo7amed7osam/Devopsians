// src/pages/ICUSelect.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { safeNavigate } from '../../utils/security';
import Skeleton from '../../components/common/Skeleton';
import usePatientLocale from '../../hooks/usePatientLocale';

const ICUSelect = ({ embedded = false }) => {
    const navigate = useNavigate();
    const { t, dir, locale } = usePatientLocale();
    const [userLocation, setUserLocation] = useState(null);
    const [icus, setIcus] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [filters, setFilters] = useState({ specialization: '', searchTerm: '' });
    const [loading, setLoading] = useState(false);
    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
    const [liveConnected, setLiveConnected] = useState(socket?.connected ?? false);
    const [showPickupModal, setShowPickupModal] = useState(false);
    const openingModalRef = useRef(false);
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
                    // Silently use default location if geolocation fails
                    setUserLocation({ lat: 30.0444, lng: 31.2357 }); 
                }
            );
        } else {
            // Silently use default location if geolocation not supported
            setUserLocation({ lat: 30.0444, lng: 31.2357 });
        }
    }, []);

    useEffect(() => {
        if (!socket) return;
        const handleConnect = () => setLiveConnected(true);
        const handleDisconnect = () => setLiveConnected(false);
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        setLiveConnected(socket.connected);
        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
        };
    }, []);

    const markUpdated = useCallback(() => setLastUpdatedAt(new Date()), []);
    
    // --- Load ICUs and Hospitals from Backend ---
    const loadICUs = useCallback(async () => {
        if (!userLocation) return;
        setLoading(true);
        try {
            // Fetch available ICUs from backend (public endpoint)
            const response = await getAvailableICUsFromServer();
            // Backend returns array directly, not wrapped in data object
            const allIcus = Array.isArray(response.data) ? response.data : [];

            // Filter available ICUs only (controller already returns available, but keep guard)
            const availableIcus = allIcus.filter(icu => icu && (icu.status || '').toString().toLowerCase() === 'available' && !icu.isReserved);

            setIcus(availableIcus);

            if (availableIcus.length === 0) {
                toast.info(t('icu.noIcus'));
            }
            markUpdated();
        } catch (err) {
            console.error("Failed to load ICU data:", err.response?.data || err.message);
            const errorMsg = err.response?.data?.message || t('icu.noIcus');
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    }, [userLocation, markUpdated, t]);

    // --- Load Nearby Hospitals (Public API - no auth required) ---
    const loadNearbyHospitals = useCallback(async () => {
        if (!userLocation) return;
        try {
            const response = await fetchNearbyHospitalsPublic(userLocation.lat, userLocation.lng, 50000); // 50km radius
            const hospitalList = response.data?.hospitals || [];
            setHospitals(hospitalList);
            markUpdated();
        } catch (err) {
            console.error("Failed to load nearby hospitals:", err);
            // Don't show error toast - this is optional feature for map display
        }
    }, [userLocation, markUpdated]);

    useEffect(() => {
        if (userLocation) {
            loadICUs();
            loadNearbyHospitals();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userLocation]);

    // Listen for socket events for ambulance assignment notifications and ICU updates
    useEffect(() => {
        const userId = getUserId();
        
        if (socket) {
            // Patient-specific notifications (only if logged in)
            if (userId) {
                socket.on('patientNotification', (data) => {
                    if (data.patientId === userId) {
                        if (data.type === 'ambulance_assigned') {
                            toast.success(`${data.message}`, {
                                autoClose: 8000,
                                position: "top-center"
                            });
                        } else if (data.type === 'pickup_request_sent') {
                            toast.info(`${data.message}`, {
                                autoClose: 8000,
                                position: "top-center"
                            });
                        } else if (data.type === 'ambulance_accepted') {
                            toast.success(`${data.message}`, {
                                autoClose: 8000,
                                position: "top-center"
                            });
                        }
                    }
                });
            }

            // Listen for real-time ICU updates (public - no auth needed)
            socket.on('icuReserved', (data) => {
                console.log('[ICUSelect] ICU reserved event received:', data);
                // Remove reserved ICU from available list
                setIcus(prev => prev.filter(icu => icu._id !== data.icuId));
                toast.info(t('icu.toastReserved', { hospitalName: data.hospitalName }), {
                    autoClose: 3000
                });
            });

            socket.on('icuReservationCancelled', (data) => {
                console.log('[ICUSelect] ICU cancellation event received:', data);
                // Reload ICUs to show newly available ICU
                loadICUs();
                toast.info(t('icu.toastAvailable'), {
                    autoClose: 3000
                });
            });

            socket.on('icuCheckOut', (data) => {
                console.log('[ICUSelect] ICU checkout event received:', data);
                // Reload ICUs to show newly available ICU
                loadICUs();
                toast.info(t('icu.toastAvailable'), {
                    autoClose: 3000
                });
            });

            socket.on('icuStatusUpdate', (data) => {
                console.log('[ICUSelect] ICU status update event received:', data);
                // Reload ICUs to reflect status changes
                loadICUs();
                toast.info(t('icu.toastStatusUpdate', { hospitalName: data.hospitalName }), {
                    autoClose: 3000
                });
            });

            socket.on('icuUpdated', (data) => {
                console.log('[ICUSelect] ICU updated event received:', data);
                // Reload ICUs to reflect all changes
                loadICUs();
            });
        }

        return () => {
            if (socket) {
                socket.off('patientNotification');
                socket.off('icuReserved');
                socket.off('icuReservationCancelled');
                socket.off('icuCheckOut');
                socket.off('icuStatusUpdate');
                socket.off('icuUpdated');
            }
        };
    }, [loadICUs]);

    // --- Handle ICU Reservation ---
    const handleReserve = async (icuId) => {
        const userId = getUserId();
        
        if (!userId) {
            toast.error(t('icu.toastLogin'));
            return;
        }

        // Guard against rapid double-clicks opening multiple modals
        if (openingModalRef.current || showPickupModal) return;
        openingModalRef.current = true;

        // Auto-fill pickup location from user's current GPS coordinates
        if (userLocation) {
            const address = `${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}`;
            setPickupLocation(address);
            
            // Try to get actual address using reverse geocoding
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}&zoom=18&addressdetails=1`,
                    {
                        headers: {
                            'Accept-Language': 'en'
                        }
                    }
                );
                const data = await response.json();
                if (data.display_name) {
                    setPickupLocation(data.display_name);
                }
            } catch (err) {
                console.error('Reverse geocoding failed:', err);
                // Keep the coordinates as fallback
            }
        }

        // Show modal to ask about pickup (only if not already open)
        if (!showPickupModal) {
            setSelectedIcuId(icuId);
            setShowPickupModal(true);
        }
        openingModalRef.current = false;
    };

    const handleConfirmReservation = async () => {
        
        if (needsPickup && !pickupLocation.trim()) {
            toast.warn(t('icu.toastPickupRequired'));
            return;
        }

        try {
            const userId = getUserId();
            setLoading(true);
            
            // Prepare pickup coordinates
            let pickupCoords = null;
            if (needsPickup && userLocation) {
                pickupCoords = {
                    type: 'Point',
                    coordinates: [userLocation.lng, userLocation.lat] // [longitude, latitude]
                };
            }
            
            const payload = {
                icuId: selectedIcuId,
                patientId: userId, // backend expects patientId
                needsPickup,
                pickupLocation: needsPickup ? pickupLocation : null,
                pickupCoordinates: needsPickup ? pickupCoords : null
            };
            
            // Call backend API to reserve ICU with pickup info
            const response = await reserveICUForPatient(payload);
            
            if (needsPickup) {
                // Changed message to show PENDING status
                toast.info(t('icu.toastReservedRedirect'), {
                    autoClose: 2000
                });
            } else {
                toast.success(t('icu.toastReservedRedirect'), {
                    autoClose: 2000
                });
            }
            
            setShowPickupModal(false);
            
            // Redirect to patient dashboard and refresh
            safeNavigate(navigate, '/patient-dashboard');
            setTimeout(() => {
                window.location.reload();
            }, 100);

        } catch (err) {
            console.error('Reservation error:', err);
            const errorMessage = err.response?.data?.message || t('icu.toastReservationFailed');
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

    const hospitalsById = useMemo(() => {
        const map = new Map();
        hospitals.forEach((hospital) => {
            const id = hospital?._id || hospital?.id;
            if (id) {
                map.set(String(id), hospital);
            }
        });
        return map;
    }, [hospitals]);

    const groupedHospitals = Object.values(
        filteredIcus.reduce((acc, icu) => {
            const hospital = icu?.hospital || {};
            const hospitalId = hospital?._id || hospital?.id || icu?.hospitalId || icu?.hospital;
            const fallbackName = hospital?.name || t('icu.unknownHospital');
            const fallbackKey = `${fallbackName}-${hospital?.address || ''}`;
            const key = hospitalId ? String(hospitalId) : fallbackKey;
            const hospitalMeta = hospitalId ? hospitalsById.get(String(hospitalId)) : null;
            const distanceMeters = typeof hospitalMeta?.distance === 'number' ? hospitalMeta.distance : null;

            if (!acc[key]) {
                acc[key] = {
                    hospitalId: hospitalId || null,
                    hospitalName: hospital?.name || hospitalMeta?.name || t('icu.unknownHospital'),
                    address: hospital?.address || hospitalMeta?.address || t('icu.distanceUnavailable'),
                    location: hospital?.location || hospitalMeta?.location || null,
                    distanceMeters,
                    icus: [],
                    specializations: new Set(),
                };
            }

            acc[key].icus.push(icu);
            if (icu?.specialization) {
                acc[key].specializations.add(icu.specialization);
            }
            return acc;
        }, {})
    ).map((group) => ({
        hospitalId: group.hospitalId,
        hospitalName: group.hospitalName,
        address: group.address,
        location: group.location,
        distanceMeters: group.distanceMeters,
        availableCount: group.icus.length,
        reserveIcuId: group.icus[0]?._id || group.icus[0]?.id || null,
        specializations: Array.from(group.specializations),
    }));

    const formatLastUpdated = useCallback(() => {
        if (!lastUpdatedAt) return t('icu.justNow');
        const diffMs = Date.now() - lastUpdatedAt.getTime();
        const diffMin = Math.max(0, Math.round(diffMs / 60000));
        if (diffMin <= 1) return t('icu.justNow');
        return t('icu.minutesAgo', { count: diffMin });
    }, [lastUpdatedAt, t]);

    const formatSpecialization = useCallback((value) => {
        switch (value) {
            case 'Surgical ICU':
                return t('icu.specialization.surgical');
            case 'Cardiac ICU':
                return t('icu.specialization.cardiac');
            case 'Neonatal ICU':
                return t('icu.specialization.neonatal');
            case 'Pediatric ICU':
                return t('icu.specialization.pediatric');
            case 'Neurological ICU':
                return t('icu.specialization.neurological');
            default:
                return value;
        }
    }, [t]);

    const insights = useMemo(() => {
        const totalAvailable = filteredIcus.length;
        const hospitalsAvailable = groupedHospitals.length;

        const feeValues = filteredIcus
            .map((icu) => Number(icu?.fees))
            .filter((fee) => !Number.isNaN(fee));
        const avgFee =
            feeValues.length > 0
                ? Math.round(feeValues.reduce((sum, value) => sum + value, 0) / feeValues.length)
                : null;

        const specializationCounts = filteredIcus.reduce((acc, icu) => {
            const key = icu?.specialization;
            if (!key) return acc;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        const topSpecializationEntry = Object.entries(specializationCounts).sort((a, b) => b[1] - a[1])[0];

        let closest = null;
        const withDistance = groupedHospitals
            .filter((group) => typeof group.distanceMeters === 'number')
            .sort((a, b) => a.distanceMeters - b.distanceMeters);

        if (withDistance.length > 0) {
            const candidate = withDistance[0];
            closest = {
                name: candidate.hospitalName,
                distanceKm: (candidate.distanceMeters / 1000).toFixed(1),
            };
        } else if (userLocation) {
            const distanceKm = (lat1, lon1, lat2, lon2) => {
                const R = 6371;
                const dLat = ((lat2 - lat1) * Math.PI) / 180;
                const dLon = ((lon2 - lon1) * Math.PI) / 180;
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos((lat1 * Math.PI) / 180) *
                        Math.cos((lat2 * Math.PI) / 180) *
                        Math.sin(dLon / 2) *
                        Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c;
            };
            let best = null;
            groupedHospitals.forEach((group) => {
                const coords = group.location?.coordinates;
                if (!Array.isArray(coords) || coords.length !== 2) return;
                const [lng, lat] = coords;
                const dist = distanceKm(userLocation.lat, userLocation.lng, lat, lng);
                if (!best || dist < best.distance) {
                    best = { name: group.hospitalName, distance: dist };
                }
            });
            if (best) {
                closest = { name: best.name, distanceKm: best.distance.toFixed(1) };
            }
        }

        return {
            totalAvailable,
            hospitalsAvailable,
            avgFee,
            topSpecializationEntry,
            closest,
        };
    }, [filteredIcus, groupedHospitals, userLocation]);

    if (!userLocation) {
        return (
            <div className={styles.loadingState}>
                <Skeleton variant="title" />
                <Skeleton count={3} />
                <Skeleton variant="block" />
            </div>
        );
    }
    
    return (
        <div
            className={`${styles.finderPage} ${embedded ? styles.finderPageEmbedded : ''}`}
            dir={dir}
            lang={locale}
        >
            {!embedded && (
                <header className={styles.pageHeader}>
                    <h1>{t('icu.selectTitle')}</h1>
                    <p>{t('icu.selectSubtitle')}</p>
                </header>
            )}

            <div className={styles.controls}>
                <input 
                    type="text" 
                    name="searchTerm"
                    placeholder={t('icu.searchPlaceholder')}
                    value={filters.searchTerm} 
                    onChange={handleFilterChange}
                />
                <select name="specialization" value={filters.specialization} onChange={handleFilterChange}>
                    <option value="">{t('icu.allSpecializations')}</option>
                    <option value="Surgical ICU">{t('icu.specialization.surgical')}</option>
                    <option value="Cardiac ICU">{t('icu.specialization.cardiac')}</option>
                    <option value="Neonatal ICU">{t('icu.specialization.neonatal')}</option>
                    <option value="Pediatric ICU">{t('icu.specialization.pediatric')}</option>
                    <option value="Neurological ICU">{t('icu.specialization.neurological')}</option>
                </select>
                <Button onClick={() => { loadICUs(); loadNearbyHospitals(); }} disabled={loading} variant="primary">
                    {loading ? t('common.searching') : t('icu.refresh')}
                </Button>
            </div>

            <div className={styles.insightsGrid}>
                <div className={styles.insightCard}>
                    <div className={styles.insightLabel}>{t('icu.insightIcus', { count: insights.totalAvailable })}</div>
                    <div className={styles.insightValue}>{insights.totalAvailable}</div>
                    <div className={styles.insightSub}>{t('icu.insightHospitals', { count: insights.hospitalsAvailable })}</div>
                </div>
                {insights.topSpecializationEntry && (
                    <div className={styles.insightCard}>
                        <div className={styles.insightLabel}>{t('icu.insightsTitle')}</div>
                        <div className={styles.insightValue}>{formatSpecialization(insights.topSpecializationEntry[0])}</div>
                        <div className={styles.insightSub}>
                            {t('icu.insightTopSpecialization', {
                                name: formatSpecialization(insights.topSpecializationEntry[0]),
                                count: insights.topSpecializationEntry[1],
                            })}
                        </div>
                    </div>
                )}
                {insights.avgFee != null && (
                    <div className={styles.insightCard}>
                        <div className={styles.insightLabel}>{t('patient.dailyFee')}</div>
                        <div className={styles.insightValue}>{insights.avgFee}</div>
                        <div className={styles.insightSub}>
                            {t('icu.insightAvgFee', { value: insights.avgFee })}
                        </div>
                    </div>
                )}
                {insights.closest && (
                    <div className={styles.insightCard}>
                        <div className={styles.insightLabel}>{t('icu.insightsTitle')}</div>
                        <div className={styles.insightValue}>{insights.closest.name}</div>
                        <div className={styles.insightSub}>
                            {t('icu.insightClosest', {
                                name: insights.closest.name,
                                distance: insights.closest.distanceKm,
                            })}
                        </div>
                    </div>
                )}
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
                    <div className={styles.listHeader}>
                        <div>
                            <div className={styles.listTitle}>{t('icu.hospitalsAvailable')}</div>
                            <div className={styles.listMeta}>
                                <span>{t('icu.insightHospitals', { count: groupedHospitals.length })}</span>
                                <span className={styles.metaDivider}>•</span>
                                <span>{t('icu.insightIcus', { count: insights.totalAvailable })}</span>
                            </div>
                        </div>
                        <div className={styles.listStatus}>
                            <span className={`${styles.liveDot} ${liveConnected ? styles.liveOn : styles.liveOff}`} />
                            <span className={styles.liveText}>{liveConnected ? t('common.live') : t('common.offline')}</span>
                            <span className={styles.updatedText}>{t('common.lastUpdated', { time: formatLastUpdated() })}</span>
                        </div>
                    </div>
                    <Icus icuList={groupedHospitals} onReserve={handleReserve} loading={loading} t={t} />
                </div>
            </div>

            {/* Pickup Request Modal */}
            <Modal isOpen={showPickupModal} onClose={() => {
                setShowPickupModal(false);
                setNeedsPickup(false);
                setPickupLocation('');
            }}>
                <div style={{ padding: '1.5rem' }}>
                    <h2 style={{ marginBottom: '1rem' }}>{t('icu.reservationTitle')}</h2>
                        
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                {t('icu.pickupQuestion')}
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
                                    {t('icu.pickupYes')}
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
                                    {t('icu.pickupNo')}
                                </label>
                            </div>
                        </div>

                        {needsPickup && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                    {t('icu.pickupAddress')}
                                </label>
                                <input 
                                    type="text"
                                    value={pickupLocation}
                                    onChange={(e) => setPickupLocation(e.target.value)}
                                    placeholder={t('icu.pickupAddressPlaceholder')}
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
                                {t('common.cancel')}
                            </Button>
                            <Button 
                                variant="primary"
                                onClick={handleConfirmReservation}
                                disabled={loading}
                            >
                                {loading ? t('icu.reserving') : t('icu.confirmReservation')}
                            </Button>
                        </div>
                    </div>
                </Modal>
        </div>
    );
};

export default ICUSelect;
