// src/pages/VacationRequests.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify'; // 1. Import toast
import { approveVacation } from '../utils/api';
import styles from './VacationRequests.module.css';
import Button from '../components/Button';

const VacationRequests = ({ hospitalId = 'HOSP_XYZ' }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    // 2. The 'error' state is no longer needed
    // const [error, setError] = useState(null);

    // MOCK DATA
    useEffect(() => {
        const loadRequests = async () => {
            setLoading(true);
            try {
                const mockRequests = [
                    { id: 'v001', employee: 'Nurse Karim Ali', role: 'Nurse', startDate: '2025-11-01', endDate: '2025-11-07', reason: 'Family event', status: 'PENDING' },
                    { id: 'v002', employee: 'Cleaner Ahmed', role: 'Cleaner', startDate: '2025-10-25', endDate: '2025-10-27', reason: 'Personal time', status: 'PENDING' },
                    { id: 'v003', employee: 'Dr. Hana Elsayed', role: 'Doctor', startDate: '2025-12-01', endDate: '2025-12-31', reason: 'Extended research trip', status: 'APPROVED' },
                ];
                setRequests(mockRequests);
            } catch (err) {
                // 3. Use toast for fetch errors
                toast.error("Failed to fetch vacation requests.");
            } finally {
                setLoading(false);
            }
        };
        loadRequests();
    }, [hospitalId]);

    // 4. Replaced confirm with a confirmation toast
    const handleApproval = async (requestId, decision) => {
        const performAction = async () => {
            try {
                // await approveVacation(requestId, decision);
                setRequests(prev => prev.map(req => 
                    req.id === requestId ? { ...req, status: decision.toUpperCase() } : req
                ));
                toast.success(`Request ${requestId} has been ${decision}.`);
            } catch (err) {
                toast.error(`Failed to process request: ${err.message}`);
            }
        };
        
        const ConfirmationToast = ({ closeToast }) => (
            <div>
                <p>Are you sure you want to {decision} this request?</p>
                <Button onClick={() => { performAction(); closeToast(); }} variant={decision === 'Approved' ? 'success' : 'secondary'} style={{ marginRight: '10px' }}>
                    Yes, {decision}
                </Button>
                <Button onClick={closeToast} variant="neutral">Cancel</Button>
            </div>
        );

        toast.warn(<ConfirmationToast />, {
            position: "top-center",
            autoClose: false,
            closeOnClick: false,
            draggable: false,
        });
    };

    if (loading) return <div className={styles.loading}>Loading vacation requests...</div>;

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>Pending Vacation Requests</h2>
            {/* 5. Removed old error message div */}
            
            <div className={styles.requestCount}>
                Total Pending: {requests.filter(r => r.status === 'PENDING').length}
            </div>

            <table className={styles.dataTable}>
                <thead>
                    <tr>
                        <th>Employee</th>
                        <th>Role</th>
                        <th>Dates Requested</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {requests.map(req => (
                        <tr key={req.id}>
                            <td>{req.employee}</td>
                            <td>{req.role}</td>
                            <td>{req.startDate} to {req.endDate}</td>
                            <td className={styles.reason}>{req.reason}</td>
                            <td><span className={styles[`status${req.status}`]}>{req.status}</span></td>
                            <td className={styles.actionButtons}>
                                {req.status === 'PENDING' ? (
                                    <>
                                        <Button onClick={() => handleApproval(req.id, 'Approved')} variant="success" className={styles.actionBtn}>
                                            Approve
                                        </Button>
                                        <Button onClick={() => handleApproval(req.id, 'Rejected')} variant="secondary" className={styles.actionBtn}>
                                            Reject
                                        </Button>
                                    </>
                                ) : (
                                    <span className={styles.statusCompleted}>{req.status}</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default VacationRequests;