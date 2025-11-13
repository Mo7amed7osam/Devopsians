// src/pages/ICUMgmt.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify'; // 1. Import toast
import { viewICUsForManager, deleteICUById, updateICUById } from '../../utils/api';
import styles from './ICUMgmt.module.css';
import socket from '../../utils/realtime';
import Button from '../../components/common/Button';

const ICUMgmt = ({ hospitalId, refresh = 0 }) => {
    const [icus, setIcus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Data Fetching ---
    useEffect(() => {
        const loadIcus = async () => {
            setLoading(true);
            try {
                const res = await viewICUsForManager();
                const icuArray = res?.data?.data || res?.data || [];
                setIcus(Array.isArray(icuArray) ? icuArray : []);
            } catch (error) {
                console.error('Failed to load ICUs:', error);
                toast.error('Failed to load ICUs.');
            } finally {
                setLoading(false);
            }
        };

        loadIcus();

        socket.on('icuStatusUpdate', (update) => {
            setIcus(prev => prev.map(icu => {
                const uid = icu._id || icu.id;
                return uid === update.icuId ? { ...icu, status: update.newStatus } : icu;
            }));
        });

        return () => {
            socket.off('icuStatusUpdate');
        };
    }, [hospitalId, refresh]);

    // 2. Replaced 'prompt' with a status cycle for better UX
    const handleStatusUpdate = async (icuId, currentStatus) => {
        const statuses = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'];
        const currentIndex = statuses.indexOf(currentStatus);
        const nextIndex = (currentIndex + 1) % statuses.length; // Cycle to the next status
        const newStatusKey = statuses[nextIndex];
        // Map frontend keys to backend enum values
        const statusMap = {
            'AVAILABLE': 'Available',
            'OCCUPIED': 'Occupied',
            'MAINTENANCE': 'Maintenance'
        };
        const newStatus = statusMap[newStatusKey] || 'Available';
        try {
            await updateICUById(icuId, { status: newStatus });
            setIcus(prev => prev.map(icu => {
                const uid = icu._id || icu.id;
                return uid === icuId ? { ...icu, status: newStatus } : icu;
            }));
            toast.info(`ICU ${icuId} status updated to ${newStatus}.`);
        } catch (err) {
            console.error('Failed to update ICU status', err);
            toast.error('Failed to update ICU status.');
        }
    };
    
   
    const handleDelete = (icuId) => {
        const performDelete = async () => {
            try {
                await deleteICUById(icuId);
                setIcus(prev => prev.filter(icu => {
                    const uid = icu._id || icu.id;
                    return uid !== icuId;
                }));
                toast.success(`ICU ${icuId} has been deleted.`);
            } catch (err) {
                console.error('Failed to delete ICU', err);
                toast.error('Failed to delete ICU.');
            }
        };

        const ConfirmationToast = ({ closeToast }) => (
            <div>
                <p>Are you sure you want to delete ICU {icuId}?</p>
                <Button onClick={() => { performDelete(); closeToast(); }} variant="danger" style={{ marginRight: '10px' }}>Yes, Delete</Button>
                <Button onClick={closeToast} variant="secondary">Cancel</Button>
            </div>
        );

        toast.warn(<ConfirmationToast />, {
            position: "top-center",
            autoClose: false,
            closeOnClick: false,
            draggable: false,
        });
    };

    const filteredIcus = icus.filter(icu =>
        (icu.room || '').toString().includes(searchTerm) || (icu.specialization || '').toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>ICU Management Overview</h2>
            
            <div className={styles.controls}>
                <input 
                    type="text" 
                    placeholder="Search by room or specialization..."
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className={styles.searchInput}
                />
            </div>

            {loading ? <div className={styles.loading}>Loading ICUs...</div> : (
                <table className={styles.icuTable}>
                    <thead>
                        <tr>
                            <th>Room #</th>
                            <th>Specialization</th>
                            <th>Capacity</th>
                            <th>Daily Fee</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredIcus.map(icu => {
                            const uid = icu._id || icu.id;
                            // Fee field may be named 'fees' on the backend; keep a fallback to older 'fee'
                            const feeValue = icu.fees ?? icu.fee ?? icu.price ?? '—';
                            // Normalize status to match CSS classes (e.g., statusAVAILABLE)
                            const rawStatus = (icu.status || '').toString();
                            const statusKey = rawStatus.toUpperCase().replace(/\s+|_/g, '');
                            const statusClass = styles[`status${statusKey}`] || '';
                            const displayStatus = rawStatus.toString().toUpperCase();

                            return (
                                <tr key={uid}>
                                    <td>{icu.room}</td>
                                    <td>{icu.specialization}</td>
                                    <td>{icu.capacity}</td>
                                    <td>EGP {feeValue}</td>
                                    <td>
                                        <span className={statusClass}>
                                            {displayStatus}
                                        </span>
                                    </td>
                                    <td className={styles.actions}>
                                        <Button onClick={() => handleStatusUpdate(uid, icu.status)} variant="primary" className={styles.actionBtn}>
                                            Update
                                        </Button>
                                        <Button onClick={() => handleDelete(uid)} variant="danger" className={styles.actionBtn}>
                                            Delete
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ICUMgmt;