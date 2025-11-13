import React, { useState, useEffect } from 'react';
import DashBoardCard from '../../components/common/DashBoardCard.jsx';
import Addicu from './Addicu.jsx';
import ICUMgmt from './ICUMgmt.jsx';
import { viewICUsForManager } from '../../utils/api';
import styles from './ManagerDashboard.module.css';
import DashboardNav from '../../components/common/DashboardNav';
import { getManagerHospital } from '../../utils/api';
import { toast } from 'react-toastify';

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
        totalICUs: 0,
        availableICUs: 0,
    });
    const handleIcuRegistered = (newIcu) => {
        const status = newIcu?.status || newIcu?.initialStatus || '';
        setDashboardStats(prev => ({
            ...prev,
            totalICUs: prev.totalICUs + 1,
            availableICUs: status.toString().toUpperCase() === 'AVAILABLE' ? prev.availableICUs + 1 : prev.availableICUs
        }));
        setActiveTab('icuMgmt');
        // trigger ICUMgmt to refetch
        setRefreshCounter(prev => prev + 1);
    };
    const dashboardTabs = [
        { id: 'icuMgmt', label: 'ICU Management' },
        { id: 'addIcu', label: 'Register ICU' },
        { id: 'visitorsKids', label: 'Auxiliary Mgmt' }
    ];
    const renderContent = () => {
        if (!hospitalInfo || !hospitalInfo.id) {
            return (
                <div className={styles.noHospitalContainer}>
                    <p>⚠️ No hospital assigned. Please contact administrator.</p>
                </div>
            );
        }

        switch (activeTab) {
            case 'icuMgmt':
                return <ICUMgmt hospitalId={hospitalInfo.id} refresh={refreshCounter} />;
            case 'addIcu':
                return <Addicu hospitalId={hospitalInfo.id} onIcuRegistered={handleIcuRegistered} />;
            case 'employeeMgmt':
                return (
                    <div className={styles.employeeMgmtGrid}>
                        <div className={styles.employeeFormColumn}>
                            <AddEmployee onEmployeeAction={(data, action) => {
                                // Simple local handler: show toast and optionally refresh
                                // In a real app we'd call API to add employee then refresh
                                console.log('Employee action', action, data);
                                // show a toast for feedback
                            }} />
                            <RemoveEmployee onEmployeeAction={(identifier, action) => {
                                console.log('Remove action', action, identifier);
                            }} />
                        </div>
                        <div className={styles.employeeTasksColumn}>
                            <GenericEmployeeDashboard employeeRole="Manager" />
                        </div>
                    </div>
                );
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

    if (loading) {
        return (
            <div className={styles.managerDashboard}>
                <div className={styles.loadingContainer}>
                    <p>Loading hospital information...</p>
                </div>
            </div>
        );
    }

    if (!hospitalInfo || !hospitalInfo.id) {
        return (
            <div className={styles.managerDashboard}>
                <header className={styles.header}>
                    <h1>Manager Dashboard</h1>
                </header>
                <div className={styles.noHospitalContainer}>
                    <p>⚠️ No hospital has been assigned to you yet.</p>
                    <p>Please contact your administrator to assign you to a hospital.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.managerDashboard}>
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
