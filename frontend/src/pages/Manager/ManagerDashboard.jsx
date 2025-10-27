import React, { useState, useEffect } from 'react';
import DashBoardCard from '../../components/common/DashBoardCard.jsx';
import Addicu from './Addicu.jsx';
import GenericEmployeeDashboard from './EmployeeMgmt.jsx';
import ICUMgmt from './ICUMgmt.jsx';
import styles from './ManagerDashboard.module.css';
import DashboardNav from '../../components/common/DashboardNav';

const iconICU = <i className="fas fa-bed"></i>;
const iconTasks = <i className="fas fa-tasks"></i>;
const iconEmployee = <i className="fas fa-user-friends"></i>;

const ManagerDashboard = () => {
    // --- Journey Section ---
    const journeySection = (
      <section className="p-4 bg-slate-800 text-gray-100 rounded-xl mb-6">
        <h2 className="text-2xl font-semibold mb-2">🧠 Manager Journey</h2>
        <ul className="list-disc ml-6 space-y-1">
          <li>Login → Access Manager Dashboard</li>
          <li>View ICU occupancy and pending reservations</li>
          <li>Approve or reject new ICU reservations</li>
          <li>Monitor live ambulance activity and ETA</li>
          <li>Handle emergency overrides or bed reassignments</li>
          <li>View alerts for delayed check-outs or double bookings</li>
        </ul>
      </section>
    );
    // ...existing code...
    const [activeTab, setActiveTab] = useState('overview');
    const [hospitalInfo, setHospitalInfo] = useState({ id: 'HOSP_XYZ', name: 'General City Clinic' });
    const [dashboardStats, setDashboardStats] = useState({
        totalICUs: 25,
        availableICUs: 12,
        employeesOnShift: 45
    });
    const handleIcuRegistered = (newIcu) => {
        setDashboardStats(prev => ({
            ...prev,
            totalICUs: prev.totalICUs + 1,
            availableICUs: newIcu.initialStatus === 'AVAILABLE' ? prev.availableICUs + 1 : prev.availableICUs
        }));
        setActiveTab('icuMgmt');
    };
    const dashboardTabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'icuMgmt', label: 'ICU Management' },
        { id: 'employeeMgmt', label: 'Employee & Tasks' },
        { id: 'addIcu', label: 'Register ICU' },
        { id: 'visitorsKids', label: 'Auxiliary Mgmt' }
    ];
    const renderContent = () => {
        switch (activeTab) {
            case 'icuMgmt':
                return <ICUMgmt hospitalId={hospitalInfo.id} />;
            case 'addIcu':
                return <Addicu hospitalId={hospitalInfo.id} onIcuRegistered={handleIcuRegistered} />;
            case 'employeeMgmt':
                return <GenericEmployeeDashboard employeeRole="Manager" />;
            case 'visitorsKids':
                return <div className={styles.sectionPlaceholder}><h3>Visitors' Room & Kids Area Management</h3><p>Implementation pending.</p></div>;
            case 'overview':
            default:
                return (
                    <div className={styles.overviewPanel}>
                        <h3 className={styles.sectionTitle}>Hospital Overview</h3>
                        <p>Managing: <strong>{hospitalInfo.name} ({hospitalInfo.id})</strong></p>
                    </div>
                );
        }
    };
    return (
        <div className={styles.managerDashboard}>
            {journeySection}
            <header className={styles.header}>
                <h1>{hospitalInfo.name} Manager Dashboard</h1>
            </header>
            <section className={styles.statsGrid}>
                <DashBoardCard
                    title="Available ICUs"
                    value={dashboardStats.availableICUs}
                    icon={iconICU}
                    color="#28a745"
                />
                 <DashBoardCard
                    title="Total ICUs"
                    value={dashboardStats.totalICUs}
                    icon={iconICU}
                    color="#007bff"
                />
                <DashBoardCard
                    title="Employees On Shift"
                    value={dashboardStats.employeesOnShift}
                    icon={iconEmployee}
                    color="#17a2b8"
                />
            </section>
            <DashboardNav
                tabs={dashboardTabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />
            <section className={styles.contentArea}>
                {renderContent()}
            </section>
        </div>
    );
};

export default ManagerDashboard;
