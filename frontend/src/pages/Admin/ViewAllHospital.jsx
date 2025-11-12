// src/pages/adminPages/ViewAllHospital.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { viewAllHospitals, blockHospital, unblockHospital, deleteHospitalById, viewAnManager } from '../../utils/api';
import styles from './ViewAllHospital.module.css';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal'; // 1. Import the Modal component

const mockHospitals = [
    { id: 'h1', name: 'Al-Salam Hospital', rating: 4.8, isBlocked: false, manager: 'Mngr 1', icuCount: 15 },
    { id: 'h2', name: 'North Star Medical', rating: 3.5, isBlocked: true, manager: 'Mngr 2', icuCount: 8 },
    { id: 'h3', name: 'General City Clinic', rating: 4.1, isBlocked: false, manager: 'Mngr 3', icuCount: 22 },
];

const ViewAllHospital = ({ newHospitalAdded, openHospitalId, onAssignManager }) => {
    const [hospitals, setHospitals] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    
    // --- State for the Modal ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
    const [managerDetails, setManagerDetails] = useState(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await viewAllHospitals();
                setHospitals(Array.isArray(res.data) ? res.data : res.data?.hospitals || []);
            } catch (err) {
                console.error('Failed to load hospitals', err);
                toast.error('Failed to load hospitals from server.');
                // fallback to mock data
                setHospitals(mockHospitals);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [newHospitalAdded]);

    // When parent requests opening a specific hospital, open it after hospitals load
    useEffect(() => {
        if (!openHospitalId) return;
        if (!hospitals || hospitals.length === 0) return;
        const found = hospitals.find(h => (h._id || h.id) === openHospitalId || (h._id && h._id.toString() === openHospitalId));
        if (found) {
            openHospitalDetails(found);
        }
    }, [openHospitalId, hospitals]);

    // --- Modal Controls ---
    const openHospitalDetails = (hospital) => {
        setSelectedHospital(hospital);
        setIsModalOpen(true);
    };
    const closeModal = () => setIsModalOpen(false);
    const closeManagerModal = () => setIsManagerModalOpen(false);

    const openManagerDetails = async (managerId) => {
        try {
            const res = await viewAnManager(managerId);
            const manager = res?.data?.data || res?.data;
            setManagerDetails(manager);
            setIsManagerModalOpen(true);
        } catch (err) {
            console.error('Failed to load manager details', err);
            toast.error('Failed to load manager details');
        }
    };
    
    // --- Action Handlers (now used inside the modal) ---
    const handleBlockToggle = async () => {
        if (!selectedHospital) return;
        const selectedId = selectedHospital._id || selectedHospital.id;
        const newStatus = !selectedHospital.isBlocked;
        try {
            // Optimistic UI update
            setHospitals(prev => prev.map(h => (h._id === selectedId || h.id === selectedId) ? { ...h, isBlocked: newStatus } : h));
            if (newStatus) {
                await blockHospital(selectedId);
            } else {
                await unblockHospital(selectedId);
            }
            toast.success(`Hospital has been ${newStatus ? 'blocked' : 'unblocked'}.`);
        } catch (err) {
            console.error('Block/unblock failed', err);
            toast.error('Failed to update hospital status.');
            // rollback optimistic update
            setHospitals(prev => prev.map(h => (h._id === selectedId || h.id === selectedId) ? { ...h, isBlocked: !newStatus } : h));
        } finally {
            closeModal(); // Close modal after action
        }
    };
    
    const handleDelete = async () => {
        if (!selectedHospital) return;

        const performDelete = async () => {
            try {
                const selectedId = selectedHospital._id || selectedHospital.id;
                await deleteHospitalById(selectedId);
                setHospitals(prev => prev.filter(h => (h._id || h.id) !== selectedId));
                toast.success(`Hospital ${selectedHospital.name} has been deleted.`);
            } catch (err) {
                console.error('Delete hospital failed', err);
                toast.error('Failed to delete hospital.');
            } finally {
                closeModal();
            }
        };

        const ConfirmationToast = ({ closeToast }) => (
            <div>
                <p>Are you sure you want to delete this hospital?</p>
                <Button onClick={async () => { await performDelete(); closeToast(); }} variant="danger" style={{ marginRight: '10px' }}>Yes, Delete</Button>
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

    const filteredHospitals = hospitals.filter((h) => {
        const name = h?.name || '';
        const manager = h?.manager || '';
        return (
            name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            manager.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

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
                        {filteredHospitals.map((hospital, idx) => (
                            <tr key={hospital._id || hospital.id || idx}>
                                <td>
                                    {/* Make the name clickable to open the modal */}
                                    <a href="#" className={styles.hospitalLink} onClick={(e) => { e.preventDefault(); openHospitalDetails(hospital); }}>
                                        {hospital.name || 'Unnamed Hospital'}
                                    </a>
                                </td>
                                <td>{typeof hospital.rating === 'number' ? hospital.rating.toFixed(1) : 'N/A'} <span className={styles.star}>★</span></td>
                                <td>{hospital.icuCount}</td>
                                <td>{hospital.assignedManager ? `${hospital.assignedManager.firstName} ${hospital.assignedManager.lastName}` : (hospital.manager || '—')}</td>
                                <td>
                                    <span className={hospital.isBlocked ? styles.statusBlocked : styles.statusActive}>
                                        {hospital.isBlocked ? 'BLOCKED' : 'ACTIVE'}
                                    </span>
                                </td>
                                {/* Action column removed per request */}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* --- HOSPITAL DETAILS MODAL --- */}
            {selectedHospital && (
                <Modal isOpen={isModalOpen} onClose={closeModal} contentLabel={`hospital-${selectedHospital._id || selectedHospital.id}`}>
                    <div className={styles.modalHeader}>
                        <h2>{selectedHospital.name}</h2>
                        <p>ID: {selectedHospital.id}</p>
                    </div>
                    <div className={styles.modalBody}>
                        <p>
                            <strong>Manager:</strong>{' '}
                            {selectedHospital.assignedManager ? (
                                <>
                                    <span>{`${selectedHospital.assignedManager.firstName} ${selectedHospital.assignedManager.lastName}`}</span>
                                    <button className={styles.linkButton} onClick={() => openManagerDetails(selectedHospital.assignedManager._id)} style={{ marginLeft: '8px' }}>View Manager</button>
                                    {typeof onAssignManager === 'function' && (
                                        <Button size="small" variant="secondary" onClick={() => { closeModal(); onAssignManager(selectedHospital._id || selectedHospital.id); }} style={{ marginLeft: '8px' }}>Change Manager</Button>
                                    )}
                                </>
                            ) : (
                                (selectedHospital.manager || 'N/A')
                            )}
                        </p>
                        <p><strong>Rating:</strong> {typeof selectedHospital.rating === 'number' ? selectedHospital.rating.toFixed(1) : 'N/A'} ★</p>
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

            {/* Manager details modal */}
            {managerDetails && (
                <Modal isOpen={isManagerModalOpen} onClose={closeManagerModal} contentLabel={`manager-${managerDetails._id}`}>
                    <div className={styles.modalHeader}>
                        <h2>{managerDetails.firstName} {managerDetails.lastName}</h2>
                        <p>ID: {managerDetails._id}</p>
                    </div>
                    <div className={styles.modalBody}>
                        <p><strong>Email:</strong> {managerDetails.email || 'N/A'}</p>
                        <p><strong>Phone:</strong> {managerDetails.phone || 'N/A'}</p>
                        <p><strong>Role:</strong> {managerDetails.role}</p>
                        <p><strong>Created At:</strong> {new Date(managerDetails.createdAt).toLocaleString()}</p>
                    </div>
                </Modal>
            )}
        </div>
    );
};
export default ViewAllHospital;