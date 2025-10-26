// src/pages/CleanerDashboard.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { updateTaskStatus, requestVacation } from '../utils/api';
import styles from './Cleaner.module.css'; // Reusing the same styles
import Button from '../components/Button';

const CleanerDashboard = () => {
    // Role is now fixed
    const employeeRole = 'Cleaner';
    const [tasks, setTasks] = useState([]);
    const [vacationForm, setVacationForm] = useState({ start: '', end: '', reason: '' });

    useEffect(() => {
        const mockTasks = [
            { id: 't1', description: 'Clean Room 301', status: 'PENDING', category: 'Cleaner' },
            { id: 't2', description: 'Monitor vital signs for Patient 10A', status: 'IN_PROGRESS', category: 'Nurse' },
            { id: 't4', description: 'Restock supplies in 3rd floor lounge', status: 'PENDING', category: 'Cleaner' },
        ];
        // Filter tasks for this specific role
        setTasks(mockTasks.filter(t => t.category.toLowerCase() === employeeRole.toLowerCase()));
    }, [employeeRole]);

    const handleTaskStatusChange = async (taskId, currentStatus) => {
        const newStatus = currentStatus === 'PENDING' ? 'IN_PROGRESS' : 'DONE';
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        toast.info(`Task status updated to ${newStatus}.`);
    };
    
    const handleVacationRequest = async (e) => {
        e.preventDefault();
        toast.success('Vacation request submitted successfully.');
        setVacationForm({ start: '', end: '', reason: '' });
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>{employeeRole.toUpperCase()} Dashboard</h1>
            
            <section className={styles.taskSection}>
                <h2>My Assigned Tasks ({tasks.filter(t => t.status !== 'DONE').length} Pending)</h2>
                <ul className={styles.taskList}>
                    {tasks.map(task => (
                        <li key={task.id} className={`${styles.taskItem} ${styles[`status${task.status}`]}`}>
                            <span>{task.description}</span>
                            <div className={styles.taskActions}>
                                <span className={styles.statusBadge}>{task.status.replace('_', ' ')}</span>
                                <Button 
                                    onClick={() => handleTaskStatusChange(task.id, task.status)}
                                    disabled={task.status === 'DONE'}
                                    variant="primary"
                                    className={styles.actionBtn}
                                >
                                    {task.status === 'PENDING' ? 'Start' : task.status === 'IN_PROGRESS' ? 'Done' : 'Completed'}
                                </Button>
                                {task.category === 'Cleaner' && task.status === 'DONE' && (
                                    <Button className={`${styles.actionBtn} ${styles.btnSterilize}`}>Mark Sterilized</Button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </section>

            {/* Kids Area section is REMOVED for Cleaner */}

            <section className={styles.vacationSection}>
                <h2>Request Vacation/Leave</h2>
                <form onSubmit={handleVacationRequest} className={styles.vacationForm}>
                    <input type="date" name="start" value={vacationForm.start} onChange={(e) => setVacationForm({...vacationForm, start: e.target.value})} required />
                    <input type="date" name="end" value={vacationForm.end} onChange={(e) => setVacationForm({...vacationForm, end: e.target.value})} required />
                    <textarea name="reason" value={vacationForm.reason} onChange={(e) => setVacationForm({...vacationForm, reason: e.target.value})} placeholder="Reason for leave" required />
                    <Button type="submit" variant="secondary">Submit Request</Button>
                </form>
            </section>
        </div>
    );
};

export default CleanerDashboard;