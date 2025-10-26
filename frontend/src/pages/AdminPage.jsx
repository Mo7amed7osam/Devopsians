// src/pages/AdminPage.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import DashBoardCard from '../components/DashBoardCard.jsx';
import AddHospital from './adminPages/AddHospital.jsx';
import ViewAllHospital from './adminPages/ViewAllHospital.jsx';
import SystemLogs from './adminPages/SystemLogs.jsx'; // 1. Import SystemLogs
import styles from './AdminPage.module.css';
import Button from '../components/Button';
import AddEmployee from '../components/AddEmployee.jsx';
import RemoveEmployee from '../components/RemoveEmployee.jsx';
import { fetchSystemStats, viewAllHospitals } from '../utils/api'; // Import necessary API functions

// --- Icon Setup ---
const iconHospital = <i className="fas fa-hospital-alt"></i>;
const iconManager = <i className="fas fa-user-tie"></i>;
const iconRating = <i className="fas fa-star-half-alt"></i>;
const iconEmployee = <i className="fas fa-users"></i>;
const iconTotalIcu = <i className="fas fa-procedures"></i>;
const iconOccupiedIcu = <i className="fas fa-bed-pulse"></i>;

const AdminPage = () => {
    const [activeTab, setActiveTab] = useState('viewHospitals'); // Keep default tab
    const [hospitalUpdateKey, setHospitalUpdateKey] = useState(0);
    const [managerForm, setManagerForm] = useState({ name: '', email: '', password: '', hospitalId: '' });
    
    const [dashboardStats, setDashboardStats] = useState({
        totalHospitals: 0,
        totalManagers: 8, // Static for now
        totalEmployees: 124, // Static for now
        avgRating: 4.2, // Static for now
        totalIcus: 0,
        occupiedIcus: 0,
        availableIcus: 0
    });
    const [loadingStats, setLoadingStats] = useState(true);

    // Fetch stats on component mount and when hospitals are updated
    useEffect(() => {
        const loadStats = async () => {
            setLoadingStats(true);
            try {
                const [statsRes, hospitalsRes] = await Promise.all([
                    fetchSystemStats(),
                    viewAllHospitals() // Fetch hospitals to get count
                ]);
                
                setDashboardStats(prev => ({
                    ...prev,
                    totalHospitals: hospitalsRes.data.length,
                    totalIcus: statsRes.data.totalIcus,
                    occupiedIcus: statsRes.data.occupiedIcus,
                    availableIcus: statsRes.data.availableIcus
                }));
            } catch (err) {
                toast.error("Failed to load dashboard statistics.");
                console.error(err);
            } finally {
                setLoadingStats(false);
            }
        };
        loadStats();
    }, [hospitalUpdateKey]); // Refetch if a hospital is added/removed

    const handleHospitalAdded = (newHospitalData) => {
        setHospitalUpdateKey(prev => prev + 1); // Trigger stat refresh
        setActiveTab('viewHospitals');
    };

    const handleManagerChange = (e) => {
        setManagerForm({ ...managerForm, [e.target.name]: e.target.value });
    };

    const handleManagerSubmit = async (e) => {
        e.preventDefault();
        toast.success(`Manager ${managerForm.name} created and assigned successfully!`);
        // Note: We are not updating manager count from API yet
        setManagerForm({ name: '', email: '', password: '', hospitalId: '' });
    };

    const handleEmployeeAction = (employee, action) => {
        if (action === 'added') {
            toast.success(`Employee "${employee.name}" was successfully added!`);
            // Note: We are not updating employee count from API yet
        }
        if (action === 'removed') {
            toast.error(`Employee "${employee}" was removed.`);
             // Note: We are not updating employee count from API yet
        }
    };
    
    // Renders content based on the active tab
    const renderContent = () => {
        switch (activeTab) {
            case 'addHospital':
                return <AddHospital onHospitalAdded={handleHospitalAdded} />;
            case 'manageManagers':
                return (
                    <form onSubmit={handleManagerSubmit} className={styles.formCard}>
                        <h3 className={styles.formTitle}>Add & Assign Manager</h3>
                        <input type="text" name="name" value={managerForm.name} onChange={handleManagerChange} placeholder="Name" required />
                        <input type="email" name="email" value={managerForm.email} onChange={handleManagerChange} placeholder="Email" required />
                        <input type="password" name="password" value={managerForm.password} onChange={handleManagerChange} placeholder="Initial Password" required />
                        <input type="text" name="hospitalId" value={managerForm.hospitalId} onChange={handleManagerChange} placeholder="Assign to Hospital ID" required />
                        <Button type="submit" variant="primary">Add & Assign Manager</Button>
                    </form>
                );
            case 'manageEmployees':
                return (
                    <div className={styles.employeeMgmtGrid}>
                        <AddEmployee onEmployeeAction={handleEmployeeAction} />
                        <RemoveEmployee onEmployeeAction={handleEmployeeAction} />
                    </div>
                );
            
            // 3. Add case for System Logs
            case 'systemLogs':
                return <SystemLogs />;

            case 'viewHospitals':
            default:
                // Pass the key to force re-render when hospitals change
                return <ViewAllHospital key={hospitalUpdateKey} />; 
        }
    };

    return (
        <div className={styles.adminDashboard}>
            <header className={styles.header}>
                <h1>System Administrator Dashboard</h1>
            </header>

            {/* Statistics Grid */}
            <section className={styles.statsGrid}>
                 <DashBoardCard 
                    title="Total Hospitals" 
                    value={loadingStats ? '...' : dashboardStats.totalHospitals} 
                    icon={iconHospital} 
                    color="#007bff"
                />
                 <DashBoardCard 
                    title="Total ICUs (System)" 
                    value={loadingStats ? '...' : dashboardStats.totalIcus} 
                    icon={iconTotalIcu} 
                    color="#6f42c1" // Purple
                />
                 <DashBoardCard 
                    title="Occupied ICUs" 
                    value={loadingStats ? '...' : `${dashboardStats.occupiedIcus} / ${dashboardStats.totalIcus}`}
                    icon={iconOccupiedIcu} 
                    color="#dc3545" // Red
                />
                 <DashBoardCard 
                    title="Total Employees" // Keep static ones for now
                    value={dashboardStats.totalEmployees} 
                    icon={iconEmployee} 
                    color="#17a2b8"
                />
                {/* Removed Avg Rating and Total Managers for space */}
            </section>

            {/* Tab Navigation */}
            <nav className={styles.tabsNav}>
                <Button className={`${styles.tabButton} ${activeTab === 'viewHospitals' ? styles.active : ''}`} onClick={() => setActiveTab('viewHospitals')}>
                    Manage Hospitals
                </Button>
                <Button className={`${styles.tabButton} ${activeTab === 'addHospital' ? styles.active : ''}`} onClick={() => setActiveTab('addHospital')}>
                    Add Hospital
                </Button>
                <Button className={`${styles.tabButton} ${activeTab === 'manageEmployees' ? styles.active : ''}`} onClick={() => setActiveTab('manageEmployees')}>
                    Manage Employees
                </Button>
                <Button className={`${styles.tabButton} ${activeTab === 'manageManagers' ? styles.active : ''}`} onClick={() => setActiveTab('manageManagers')}>
                    Add Manager
                </Button>
                {/* 2. Add System Logs Tab Button */}
                <Button className={`${styles.tabButton} ${activeTab === 'systemLogs' ? styles.active : ''}`} onClick={() => setActiveTab('systemLogs')}>
                    System Logs
                </Button>
            </nav>

            {/* Dynamic Content Area */}
            <section className={styles.contentArea}>
                {renderContent()}
            </section>
        </div>
    );
};

export default AdminPage;