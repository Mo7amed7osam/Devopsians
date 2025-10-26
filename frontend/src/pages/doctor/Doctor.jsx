// src/pages/Doctor.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import styles from './Doctor.module.css';
import Button from '../components/Button';

// --- Sub-Component: PatientStatusCard ---
const PatientStatusCard = ({ patient, onSelect, isSelected }) => {
    const getStatusClass = (condition) => {
        if (condition.toLowerCase().includes('critical')) return styles.statusCritical;
        if (condition.toLowerCase().includes('stable')) return styles.statusStable;
        return styles.statusMonitoring;
    };
    return (
        <div 
            className={`${styles.patientCard} ${isSelected ? styles.activeCard : ''}`}
            onClick={() => onSelect(patient)}
        >
            <div className={`${styles.statusIndicator} ${getStatusClass(patient.condition)}`}></div>
            <div className={styles.patientInfo}>
                <h4 className={styles.cardPatientName}>{patient.name.split('(')[0].trim()}</h4>
                <p className={styles.cardPatientRoom}>Room: {patient.room}</p>
            </div>
        </div>
    );
};

const DoctorPage = () => {
    const [activeTab, setActiveTab] = useState('monitoring');
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [vacationForm, setVacationForm] = useState({ start: '', end: '', reason: '' });

    // --- NEW: State for appointments ---
    const [appointments, setAppointments] = useState([]);

    useEffect(() => {
        const mockPatients = [
            { id: 'p001', name: 'Patient A (ICU 1A)', condition: 'Stable, monitoring vitals', room: '1A', medHistory: 'Allergies: Penicillin', medSchedule: [{ med: 'Ibuprofen', dose: '10mg', time: '08:00' }] },
            { id: 'p002', name: 'Patient B (ICU 2C)', condition: 'Critical, requires monitoring', room: '2C', medHistory: 'Asthma, Diabetes', medSchedule: [] },
            { id: 'p003', name: 'Patient C (ICU 3B)', condition: 'Under observation', room: '3B', medHistory: 'N/A', medSchedule: [] },
        ];
        
        const mockAppointments = [
            { id: 'a1', time: '09:00', patientName: 'Patient A', room: '1A', task: 'Morning Rounds & Vitals Check', status: 'PENDING' },
            { id: 'a2', time: '11:30', patientName: 'Patient B', room: '2C', task: 'Consultation with Specialist', status: 'PENDING' },
            { id: 'a3', time: '14:00', patientName: 'Patient C', room: '3B', task: 'Review Lab Results', status: 'PENDING' },
        ];

        setPatients(mockPatients);
        setAppointments(mockAppointments);
        setLoading(false);
    }, []);

    const handleScheduleMeds = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newMed = {
            med: formData.get('med'),
            dose: formData.get('dose'),
            time: formData.get('time'),
        };

        const updatedPatients = patients.map(p => 
            p.id === selectedPatient.id 
                ? { ...p, medSchedule: [...p.medSchedule, newMed] } 
                : p
        );
        setPatients(updatedPatients);
        
        setSelectedPatient(prev => ({ ...prev, medSchedule: [...prev.medSchedule, newMed] }));

        toast.success(`Medicine scheduled for ${selectedPatient.name}.`);
        e.target.reset();
    };

    const handleVacationRequest = async (e) => {
        e.preventDefault();
        toast.success('Vacation request submitted successfully.');
        setVacationForm({ start: '', end: '', reason: '' });
    };

    const handleMarkAppointmentComplete = (appointmentId) => {
        setAppointments(prev => 
            prev.map(app => 
                app.id === appointmentId ? { ...app, status: 'COMPLETED' } : app
            )
        );
        toast.info('Appointment marked as complete.');
    };

    if (loading) return <div className={styles.loading}>Loading dashboard...</div>;

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Doctor's Dashboard</h1>
            
            <nav className={styles.tabsNav}>
                <Button 
                    variant={activeTab === 'monitoring' ? 'primary' : 'secondary'}
                    onClick={() => setActiveTab('monitoring')}
                >
                    Patient Monitoring
                </Button>
                <Button 
                    variant={activeTab === 'schedule' ? 'primary' : 'secondary'}
                    onClick={() => setActiveTab('schedule')}
                >
                    My Schedule
                </Button>
            </nav>

            {activeTab === 'monitoring' && (
                <div className={styles.contentGrid}>
                    <div className={styles.patientList}>
                        <h3>Patients on My Watch ({patients.length})</h3>
                        <div className={styles.patientCardGrid}>
                            {patients.map(patient => (
                                <PatientStatusCard 
                                    key={patient.id} 
                                    patient={patient}
                                    onSelect={setSelectedPatient}
                                    isSelected={selectedPatient?.id === patient.id}
                                />
                            ))}
                        </div>
                    </div>

                    <div className={styles.detailsPanel}>
                        {selectedPatient ? (
                            <>
                                <h2 className={styles.patientName}>{selectedPatient.name.split('(')[0]}</h2>
                                <p className={styles.roomInfo}>Current Condition: <span className={styles.status}>{selectedPatient.condition}</span></p>
                                
                                <div className={styles.detailCard}>
                                    <h3 className={styles.subtitle}>Patient's Medical History</h3>
                                    <div className={styles.historyBox}>
                                        {selectedPatient.medHistory || 'No detailed history available.'}
                                    </div>
                                </div>
                                
                                <div className={styles.detailCard}>
                                    <h3 className={styles.subtitle}>Current Medicine Schedule</h3>
                                    <table className={styles.scheduleTable}>
                                        <thead>
                                            <tr>
                                                <th>Time</th>
                                                <th>Medicine</th>
                                                <th>Dose</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedPatient.medSchedule.length === 0 ? (
                                                <tr><td colSpan="3">No medicines scheduled yet.</td></tr>
                                            ) : (
                                                selectedPatient.medSchedule.map((med, index) => (
                                                    <tr key={index}>
                                                        <td>{med.time}</td>
                                                        <td>{med.med}</td>
                                                        <td>{med.dose}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <form onSubmit={handleScheduleMeds} className={styles.medForm}>
                                    <h4>Schedule New Medicine</h4>
                                    <input type="text" name="med" placeholder="Medicine Name" required />
                                    <input type="text" name="dose" placeholder="Dosage (e.g., 5mg)" required />
                                    <input type="time" name="time" required />
                                    <Button type="submit" variant="primary" className={styles.scheduleBtn}>
                                        Schedule
                                    </Button>
                                </form>
                            </>
                        ) : (
                            <div className={styles.placeholder}>← Select a patient to view and update their treatment.</div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'schedule' && (
                <div className={styles.scheduleContainer}>
                    <section className={styles.vacationSection}>
                        <h2>Request Vacation/Leave</h2>
                        <form onSubmit={handleVacationRequest} className={styles.vacationForm}>
                            <input type="date" name="start" value={vacationForm.start} onChange={(e) => setVacationForm({...vacationForm, start: e.target.value})} required />
                            <input type="date" name="end" value={vacationForm.end} onChange={(e) => setVacationForm({...vacationForm, end: e.target.value})} required />
                            <textarea name="reason" value={vacationForm.reason} onChange={(e) => setVacationForm({...vacationForm, reason: e.target.value})} placeholder="Reason for leave" required />
                            <Button type="submit" variant="primary">Submit Request</Button>
                        </form>
                    </section>
                    
                    <section className={styles.appointmentsSection}>
                        <h2>Today's Appointments & Rounds</h2>
                        <ul className={styles.appointmentList}>
                            {appointments.map(app => (
                                <li key={app.id} className={`${styles.appointmentItem} ${app.status === 'COMPLETED' ? styles.completed : ''}`}>
                                    <div className={styles.appointmentTime}>{app.time}</div>
                                    <div className={styles.appointmentDetails}>
                                        <div className={styles.appointmentTask}>{app.task}</div>
                                        <div className={styles.appointmentPatient}>Patient: {app.patientName} (Room {app.room})</div>
                                    </div>
                                    <Button 
                                        onClick={() => handleMarkAppointmentComplete(app.id)}
                                        disabled={app.status === 'COMPLETED'}
                                        variant={app.status === 'COMPLETED' ? 'secondary' : 'success'}
                                        className={styles.appointmentBtn}
                                    >
                                        {app.status === 'COMPLETED' ? 'Done' : 'Complete'}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            )}
        </div>
    );
};

export default DoctorPage;