import React, { useState, useEffect } from 'react';
import DashBoardCard from '../components/DashBoardCard.jsx';
import Addicu from './managerPages/Addicu.jsx';
// Correctly import the component exported from EmployeeMgmt.jsx (assuming you renamed the export)
import GenericEmployeeDashboard from './EmployeeMgmt.jsx';
import VacationRequests from './VacationRequests.jsx';
import ICUMgmt from './ICUMgmt.jsx'; // Central ICU table management
import styles from './ManagerDashboard.module.css';
// Import the DashboardNav component which uses its own CSS module now
import DashboardNav from '../components/DashboardNav..jsx'; // Corrected import path/name

// --- Icon Setup ---
const iconICU = <i className="fas fa-bed"></i>;
const iconTasks = <i className="fas fa-tasks"></i>; // Example if needed
const iconVacation = <i className="fas fa-calendar-check"></i>;
const iconEmployee = <i className="fas fa-user-friends"></i>;

const ManagerDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    // MOCK: In a real app, this would likely come from context or an API call
    const [hospitalInfo, setHospitalInfo] = useState({ id: 'HOSP_XYZ', name: 'General City Clinic' });

    // MOCK DATA: Fetch these from API in a real application
    const [dashboardStats, setDashboardStats] = useState({
        totalICUs: 25,
        availableICUs: 12,
        pendingVacations: 3,
        employeesOnShift: 45 // Example stat
    });

    // Add loading state if fetching data asynchronously
    // const [loading, setLoading] = useState(true);
    // useEffect(() => { /* Fetch data here */ setLoading(false); }, []);

    // --- Handlers ---
    const handleIcuRegistered = (newIcu) => {
        // Update stats optimistically or refetch
        setDashboardStats(prev => ({
            ...prev,
            totalICUs: prev.totalICUs + 1,
            // Only increment available if the new ICU's initial status is AVAILABLE
            availableICUs: newIcu.initialStatus === 'AVAILABLE' ? prev.availableICUs + 1 : prev.availableICUs
        }));
        setActiveTab('icuMgmt'); // Switch tab after adding
    };

    // Define tabs for the navigation component
    const dashboardTabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'icuMgmt', label: 'ICU Management' },
        { id: 'employeeMgmt', label: 'Employee & Tasks' },
        { id: 'vacations', label: 'Vacation Requests' },
        { id: 'addIcu', label: 'Register ICU' }, // Add ICU as a separate tab maybe?
        { id: 'visitorsKids', label: 'Auxiliary Mgmt' } // Placeholder
    ];


    const renderContent = () => {
        switch (activeTab) {
            case 'icuMgmt':
                return <ICUMgmt hospitalId={hospitalInfo.id} />;
            case 'addIcu':
                return <Addicu hospitalId={hospitalInfo.id} onIcuRegistered={handleIcuRegistered} />;
            case 'employeeMgmt':
                 // Use the correctly imported component
                return <GenericEmployeeDashboard employeeRole="Manager" />;
            case 'vacations':
                return <VacationRequests hospitalId={hospitalInfo.id} />;
            case 'visitorsKids':
                return <div className={styles.sectionPlaceholder}><h3>Visitors' Room & Kids Area Management</h3><p>Implementation pending.</p></div>;
            case 'overview':
            default:
                return (
                    <div className={styles.overviewPanel}>
                        <h3 className={styles.sectionTitle}>Hospital Overview</h3>
                        <p>Managing: **{hospitalInfo.name} ({hospitalInfo.id})**</p>
                        {/* Removed quick action buttons as tabs are clearer */}
                    </div>
                );
        }
    };

    return (
        // Added check for isDarkMode if needed, though CSS module handles it
        <div className={styles.managerDashboard}>
            <header className={styles.header}>
                <h1>{hospitalInfo.name} Manager Dashboard</h1>
            </header>

            {/* Statistics Grid */}
            <section className={styles.statsGrid}>
                <DashBoardCard
                    title="Available ICUs"
                    value={dashboardStats.availableICUs}
                    icon={iconICU}
                    color="#28a745" // Green
                />
                 <DashBoardCard
                    title="Total ICUs"
                    value={dashboardStats.totalICUs}
                    icon={iconICU}
                    color="#007bff" // Blue
                />
                <DashBoardCard
                    title="Employees On Shift" // Example, adjust as needed
                    value={dashboardStats.employeesOnShift}
                    icon={iconEmployee}
                    color="#17a2b8" // Cyan
                />
                <DashBoardCard
                    title="Pending Vacations"
                    value={dashboardStats.pendingVacations}
                    icon={iconVacation}
                    color="#ffc107" // Yellow
                />

            </section>

            {/* Use the DashboardNav component */}
            <DashboardNav
                tabs={dashboardTabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />

            {/* Dynamic Content */}
            <section className={styles.contentArea}>
                {renderContent()}
            </section>
        </div>
    );
};
export default ManagerDashboard;