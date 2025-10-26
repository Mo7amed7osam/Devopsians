// src/pages/EmployeeMgmt.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
// NOTE: Assuming requestVacation might still be relevant for *any* employee managed here
import { updateTaskStatus, requestVacation } from '../utils/api';
import styles from './EmployeeMgmt.module.css';
import Button from '../components/Button';

// Renamed component for clarity, assuming it's used by Manager for various roles
const GenericEmployeeDashboard = ({ employeeRole = 'Employee' }) => {
    const [tasks, setTasks] = useState([]);
    const [vacationForm, setVacationForm] = useState({ start: '', end: '', reason: '' });

    useEffect(() => {
        // In a real app, you'd fetch tasks based on the employeeRole or managed employees
        const mockTasks = [
            { id: 't1', description: 'Clean Room 301', status: 'PENDING', category: 'Cleaner' },
            { id: 't2', description: 'Monitor vital signs for Patient 10A', status: 'IN_PROGRESS', category: 'Nurse' },
            { id: 't3', description: 'Check-in Patient arrival', status: 'DONE', category: 'Receptionist' },
            // Add more generic or manager-relevant tasks if needed
        ];
        // Filter tasks appropriate for the context where this component is used
        // This filtering might need adjustment depending on how Manager uses it
        setTasks(mockTasks.filter(t => t.category.toLowerCase() === employeeRole.toLowerCase()));
    }, [employeeRole]);

    const handleTaskStatusChange = async (taskId, currentStatus) => {
        const newStatus = currentStatus === 'PENDING' ? 'IN_PROGRESS' : 'DONE';
        // Mock API Call: await updateTaskStatus(taskId, newStatus);
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        toast.info(`Task status updated to ${newStatus}.`); // Keep toast notification
    };

    const handleVacationRequest = async (e) => {
        e.preventDefault();
        // Mock API Call: await requestVacation({ ...vacationForm, role: employeeRole });
        toast.success('Vacation request submitted successfully.');
        setVacationForm({ start: '', end: '', reason: '' });
    };

    return (
        <div className={styles.container}>
            {/* Title might need adjustment depending on ManagerDashboard usage */}
            <h1 className={styles.title}>{employeeRole.toUpperCase()} Tasks & Requests</h1>

            <section className={styles.taskSection}>
                <h2>Assigned Tasks ({tasks.filter(t => t.status !== 'DONE').length} Active)</h2>
                {tasks.length === 0 ? (
                    <p>No tasks assigned matching this role/filter.</p>
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
                                        variant={task.status === 'PENDING' ? 'primary' : 'success'} // Adjusted variant logic slightly
                                        className={styles.actionBtn}
                                    >
                                        {task.status === 'PENDING' ? 'Start' : task.status === 'IN_PROGRESS' ? 'Mark Done' : 'Completed'}
                                    </Button>
                                    {/* --- "Mark Sterilized" Button REMOVED --- */}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* --- Kids Area Section REMOVED --- */}

            <section className={styles.vacationSection}>
                <h2>Request Vacation / Leave</h2>
                <form onSubmit={handleVacationRequest} className={styles.vacationForm}>
                    {/* Consider adding labels here for accessibility */}
                    <input type="date" name="start" value={vacationForm.start} onChange={(e) => setVacationForm({...vacationForm, start: e.target.value})} required placeholder="Start Date" />
                    <input type="date" name="end" value={vacationForm.end} onChange={(e) => setVacationForm({...vacationForm, end: e.target.value})} required placeholder="End Date" />
                    <textarea name="reason" value={vacationForm.reason} onChange={(e) => setVacationForm({...vacationForm, reason: e.target.value})} placeholder="Reason for leave" required />
                    <Button type="submit" variant="secondary">Submit Request</Button>
                </form>
            </section>
        </div>
    );
};

// Ensure the export name matches if ManagerDashboard imports it directly
export default GenericEmployeeDashboard;