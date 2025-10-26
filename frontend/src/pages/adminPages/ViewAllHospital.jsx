// src/pages/adminPages/ViewAllHospital.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { viewAllHospitals, blockHospital } from '../../utils/api';
import styles from './ViewAllHospital.module.css';
import Button from '../../components/Button';
import Modal from '../../components/Modal'; // 1. Import the Modal component

const mockHospitals = [
    { id: 'h1', name: 'Al-Salam Hospital', rating: 4.8, isBlocked: false, manager: 'Mngr 1', icuCount: 15 },
    { id: 'h2', name: 'North Star Medical', rating: 3.5, isBlocked: true, manager: 'Mngr 2', icuCount: 8 },
    { id: 'h3', name: 'General City Clinic', rating: 4.1, isBlocked: false, manager: 'Mngr 3', icuCount: 22 },
];

const ViewAllHospital = ({ newHospitalAdded }) => {
    const [hospitals, setHospitals] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    
    // --- State for the Modal ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedHospital, setSelectedHospital] = useState(null);

    useEffect(() => {
        setLoading(true);
        // Simulating API call
        setHospitals(mockHospitals);
        setLoading(false);
    }, [newHospitalAdded]);

    // --- Modal Controls ---
    const openHospitalDetails = (hospital) => {
        setSelectedHospital(hospital);
        setIsModalOpen(true);
    };
    const closeModal = () => setIsModalOpen(false);
    
    // --- Action Handlers (now used inside the modal) ---
    const handleBlockToggle = async () => {
        if (!selectedHospital) return;
        const newStatus = !selectedHospital.isBlocked;
        
        setHospitals(prev => prev.map(h => 
            h.id === selectedHospital.id ? { ...h, isBlocked: newStatus } : h
        ));
        toast.success(`Hospital has been ${newStatus ? 'blocked' : 'unblocked'}.`);
        closeModal(); // Close modal after action
    };
    
    const handleDelete = async () => {
        if (!selectedHospital) return;

        const performDelete = () => {
            setHospitals(prev => prev.filter(h => h.id !== selectedHospital.id));
            toast.success(`Hospital ${selectedHospital.name} has been deleted.`);
            closeModal();
        };

        const ConfirmationToast = ({ closeToast }) => (
            <div>
                <p>Are you sure you want to delete this hospital?</p>
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

    const filteredHospitals = hospitals.filter(h =>
        h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (h.manager && h.manager.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className={styles.listContainer}>
            <h3 className={styles.title}>All Registered Hospitals ({hospitals.length})</h3>
            
            <div className={styles.controls}>
                <input
                    type="text"
                    placeholder="Search by name or manager..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                />
            </div>

            {loading ? (
                <div className={styles.loading}>Loading hospital data...</div>
            ) : (
                <table className={styles.hospitalTable}>
                    <thead>
                        <tr>
                            <th>Hospital Name</th>
                            <th>Rating</th>
                            <th>ICU Count</th>
                            <th>Manager</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredHospitals.map(hospital => (
                            <tr key={hospital.id}>
                                <td>
                                    {/* Make the name clickable to open the modal */}
                                    <a href="#" className={styles.hospitalLink} onClick={(e) => { e.preventDefault(); openHospitalDetails(hospital); }}>
                                        {hospital.name}
                                    </a>
                                </td>
                                <td>{hospital.rating.toFixed(1)} <span className={styles.star}>★</span></td>
                                <td>{hospital.icuCount}</td>
                                <td>{hospital.manager}</td>
                                <td>
                                    <span className={hospital.isBlocked ? styles.statusBlocked : styles.statusActive}>
                                        {hospital.isBlocked ? 'BLOCKED' : 'ACTIVE'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* --- HOSPITAL DETAILS MODAL --- */}
            {selectedHospital && (
                <Modal isOpen={isModalOpen} onClose={closeModal}>
                    <div className={styles.modalHeader}>
                        <h2>{selectedHospital.name}</h2>
                        <p>ID: {selectedHospital.id}</p>
                    </div>
                    <div className={styles.modalBody}>
                        <p><strong>Manager:</strong> {selectedHospital.manager}</p>
                        <p><strong>Rating:</strong> {selectedHospital.rating.toFixed(1)} ★</p>
                        <p><strong>ICU Capacity:</strong> {selectedHospital.icuCount}</p>
                        <p><strong>Current Status:</strong> {selectedHospital.isBlocked ? 'Blocked' : 'Active'}</p>
                    </div>
                    <div className={styles.modalActions}>
                        <Button
                            onClick={handleBlockToggle}
                            variant={selectedHospital.isBlocked ? 'success' : 'secondary'}
                        >
                            {selectedHospital.isBlocked ? 'Unblock' : 'Block'} Hospital
                        </Button>
                        <Button
                            onClick={handleDelete}
                            variant="danger"
                        >
                            Delete Hospital
                        </Button>
                    </div>
                </Modal>
            )}
        </div>
    );
};
export default ViewAllHospital;