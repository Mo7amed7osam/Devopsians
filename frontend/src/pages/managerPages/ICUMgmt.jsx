// src/pages/ICUMgmt.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify'; // 1. Import toast
import { viewHospitalICUs, deleteICU } from '../utils/api';
import styles from './ICUMgmt.module.css';
import socket from '../utils/realtime';
import Button from '../components/Button';

const ICUMgmt = ({ hospitalId }) => {
    const [icus, setIcus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Data Fetching ---
    useEffect(() => {
        const loadIcus = async () => {
            setLoading(true);
            try {
                const mockIcus = [
                    { id: 'icu01', room: '101', specialization: 'Cardiology', status: 'AVAILABLE', capacity: 1, fee: 600 },
                    { id: 'icu02', room: '102', specialization: 'Neurology', status: 'OCCUPIED', capacity: 1, fee: 800 },
                    { id: 'icu03', room: '103', specialization: 'General', status: 'MAINTENANCE', capacity: 2, fee: 500 },
                ];
                setIcus(mockIcus);
            } catch (error) {
                console.error('Failed to load ICUs:', error);
                toast.error('Failed to load ICUs.');
            } finally {
                setLoading(false);
            }
        };

        loadIcus();
        
        socket.on('icuStatusUpdate', (update) => {
            setIcus(prev => prev.map(icu => 
                icu.id === update.icuId ? { ...icu, status: update.newStatus } : icu
            ));
        });
        
        return () => {
            socket.off('icuStatusUpdate');
        };
    }, [hospitalId]);

    // 2. Replaced 'prompt' with a status cycle for better UX
    const handleStatusUpdate = (icuId, currentStatus) => {
        const statuses = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'];
        const currentIndex = statuses.indexOf(currentStatus);
        const nextIndex = (currentIndex + 1) % statuses.length; // Cycle to the next status
        const newStatus = statuses[nextIndex];

        setIcus(prev => prev.map(icu => 
            icu.id === icuId ? { ...icu, status: newStatus } : icu
        ));
        
        toast.info(`ICU ${icuId} status updated to ${newStatus}.`);
    };
    
   
    const handleDelete = (icuId) => {
        const performDelete = () => {
            setIcus(prev => prev.filter(icu => icu.id !== icuId));
            toast.success(`ICU ${icuId} has been deleted.`);
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
        icu.room.includes(searchTerm) || icu.specialization.toLowerCase().includes(searchTerm.toLowerCase())
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
                        {filteredIcus.map(icu => (
                            <tr key={icu.id}>
                                <td>{icu.room}</td>
                                <td>{icu.specialization}</td>
                                <td>{icu.capacity}</td>
                                <td>EGP {icu.fee}</td>
                                <td>
                                    <span className={styles[`status${icu.status.replace('_', '')}`]}>
                                        {icu.status}
                                    </span>
                                </td>
                                <td className={styles.actions}>
                                    <Button onClick={() => handleStatusUpdate(icu.id, icu.status)} variant="primary" className={styles.actionBtn}>
                                        Update
                                    </Button>
                                    <Button onClick={() => handleDelete(icu.id)} variant="danger" className={styles.actionBtn}>
                                        Delete
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ICUMgmt;