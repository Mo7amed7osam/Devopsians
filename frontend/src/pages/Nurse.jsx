// src/pages/NurseDashboard.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { updateTaskStatus, requestVacation } from '../utils/api'; // Assuming API functions exist
import styles from './Nurse.module.css'; // Use specific styles
import Button from '../components/Button';
import Modal from '../components/Modal'; // <-- 1. Import the Modal component

const NurseDashboard = () => {
    const employeeRole = 'Nurse';
    const [tasks, setTasks] = useState([]);
    const [kidsAreaStatus, setKidsAreaStatus] = useState('0/5'); // Example status
    const [vacationForm, setVacationForm] = useState({ start: '', end: '', reason: '' });

    // --- State for Kids Area Modal ---
    const [isKidsModalOpen, setIsKidsModalOpen] = useState(false); // <-- 2. Modal visibility state
    const [selectedTimeSlot, setSelectedTimeSlot] = useState(''); // <-- 3. State for time input

    useEffect(() => {
        // Fetch tasks specific to the nurse
        const mockTasks = [
             { id: 't2', description: 'Monitor vital signs for Patient 10A', status: 'IN_PROGRESS', category: 'Nurse' },
             { id: 't4', description: 'Administer medication for Patient 12B', status: 'PENDING', category: 'Nurse' },
             { id: 't5', description: 'Update patient chart for 10A', status: 'DONE', category: 'Nurse' },
        ];
        setTasks(mockTasks.filter(t => t.category.toLowerCase() === employeeRole.toLowerCase()));

        // Fetch initial Kids Area status (if needed)
        // async function fetchKidsAreaStatus() { ... setKidsAreaStatus(result); }
        // fetchKidsAreaStatus();

    }, [employeeRole]);

    const handleTaskStatusChange = async (taskId, currentStatus) => {
        const newStatus = currentStatus === 'PENDING' ? 'IN_PROGRESS' : 'DONE';
        // API Call Placeholder: await updateTaskStatus(taskId, newStatus);
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        toast.info(`Task status updated to ${newStatus}.`);
    };

    const handleVacationRequest = async (e) => {
        e.preventDefault();
        // API Call Placeholder: await requestVacation({ ...vacationForm, role: employeeRole });
        toast.success('Vacation request submitted successfully.');
        setVacationForm({ start: '', end: '', reason: '' });
    };

    // --- Modal Handlers ---
    const openKidsModal = () => setIsKidsModalOpen(true); // <-- 4. Function to open modal
    const closeKidsModal = () => { // <-- 5. Function to close modal and reset time
        setIsKidsModalOpen(false);
        setSelectedTimeSlot('');
    };

    const handleKidsAreaSubmit = (e) => { // <-- 6. Handler for modal form submission
        e.preventDefault();
        if (!selectedTimeSlot) {
            toast.warn('Please select a time slot.');
            return;
        }
        // API Call Placeholder: reserveKidsAreaSlot(selectedTimeSlot);
        // For now, just show a success message and update mock status
        console.log(`Reserving Kids Area slot for: ${selectedTimeSlot}`);
        toast.success(`Kids Area time slot at ${selectedTimeSlot} requested.`);
        // Example: Update occupancy status (in a real app, this might come from API/socket)
        const currentOccupancy = parseInt(kidsAreaStatus.split('/')[0]);
        const maxOccupancy = parseInt(kidsAreaStatus.split('/')[1]);
        if (currentOccupancy < maxOccupancy) {
            setKidsAreaStatus(`${currentOccupancy + 1}/${maxOccupancy}`);
        }
        closeKidsModal(); // Close modal on successful submission
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>{employeeRole.toUpperCase()} Dashboard</h1>

            {/* Task Section (no changes) */}
            <section className={styles.taskSection}>
                <h2>My Assigned Tasks ({tasks.filter(t => t.status !== 'DONE').length} Active)</h2>
                {tasks.length === 0 ? (
                    <p>No tasks assigned at the moment.</p>
                ) : (
                    <ul className={styles.taskList}>
                        {tasks.map(task => (
                             <li key={task.id} className={`${styles.taskItem} ${styles[`status${task.status}`]}`}>
                                <span>{task.description}</span>
                                <div className={styles.taskActions}>
                                    <span className={styles.statusBadge}>{task.status.replace('_', ' ')}</span>
                                    <Button
                                        onClick={() => handleTaskStatusChange(task.id, task.status)}
                                        disabled={task.status === 'DONE'}
                                        variant={task.status === 'PENDING' ? 'primary' : 'success'}
                                        className={styles.actionBtn}
                                    >
                                        {task.status === 'PENDING' ? 'Start Task' : task.status === 'IN_PROGRESS' ? 'Mark Done' : 'Completed'}
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Kids Area Status Section - Button now opens modal */}
            <section className={styles.statusSection}>
                <h2>Kids Area Status</h2>
                <p className={styles.kidsStatus}>Current Occupancy: <strong>{kidsAreaStatus}</strong></p>
                <Button className={styles.btnReserveSlot} onClick={openKidsModal}> {/* <-- 7. Attach openModal handler */}
                    Reserve Time Slot
                </Button>
            </section>

             {/* Vacation Request Section (no changes) */}
            <section className={styles.vacationSection}>
                 <h2>Request Vacation / Leave</h2>
                 <form onSubmit={handleVacationRequest} className={styles.vacationForm}>
                     <label htmlFor="vacationStart">Start Date:</label>
                    <input id="vacationStart" type="date" name="start" value={vacationForm.start} onChange={(e) => setVacationForm({...vacationForm, start: e.target.value})} required />
                     <label htmlFor="vacationEnd">End Date:</label>
                    <input id="vacationEnd" type="date" name="end" value={vacationForm.end} onChange={(e) => setVacationForm({...vacationForm, end: e.target.value})} required />
                     <label htmlFor="vacationReason">Reason:</label>
                    <textarea id="vacationReason" name="reason" value={vacationForm.reason} onChange={(e) => setVacationForm({...vacationForm, reason: e.target.value})} placeholder="Brief reason for leave request" required />
                    <Button type="submit" variant="secondary">Submit Request</Button>
                </form>
            </section>

            {/* --- Kids Area Reservation Modal --- */}
            {/* <-- 8. Add the Modal component structure --> */}
            <Modal isOpen={isKidsModalOpen} onClose={closeKidsModal}>
                <h2>Reserve Kids Area Time Slot</h2>
                <form onSubmit={handleKidsAreaSubmit} className={styles.modalForm}> {/* Optional: Add class for specific styling */}
                    <p>Select a 1-hour time slot for a child's visit.</p>
                    <label htmlFor="kidsTimeSlot" className={styles.modalLabel}>Time Slot:</label>
                    <input
                        id="kidsTimeSlot"
                        type="time"
                        value={selectedTimeSlot}
                        onChange={(e) => setSelectedTimeSlot(e.target.value)}
                        className={styles.modalInput} // Optional: Add class for specific styling
                        required
                        // Optional: Add min/max/step attributes if needed
                        // step="3600" // Only allow selection on the hour
                    />
                    <Button type="submit" variant="primary" style={{ width: '100%', marginTop: '20px' }}>
                        Confirm Reservation
                    </Button>
                </form>
            </Modal>
        </div>
    );
};

export default NurseDashboard;