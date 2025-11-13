import React, { useState, useEffect } from 'react';
import DashBoardCard from '../../components/common/DashBoardCard.jsx';
import Addicu from './Addicu.jsx';
import GenericEmployeeDashboard from './EmployeeMgmt.jsx';
import AddEmployee from '../../components/manager/AddEmployee.jsx';
import RemoveEmployee from '../../components/manager/RemoveEmployee.jsx';
import ICUMgmt from './ICUMgmt.jsx';
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
      </section>
    );
    // ...existing code...
    const [activeTab, setActiveTab] = useState('overview');
    const [hospitalInfo, setHospitalInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dashboardStats, setDashboardStats] = useState({
        totalICUs: 25,
        availableICUs: 12,
        employeesOnShift: 45
    });

    // Fetch manager's assigned hospital on mount
    useEffect(() => {
        const fetchHospitalInfo = async () => {
            try {
                setLoading(true);
                const response = await getManagerHospital();
                if (response.data.success && response.data.data) {
                    const hospital = response.data.data;
                    setHospitalInfo({
                        id: hospital._id,
                        name: hospital.name,
                        address: hospital.address,
                        email: hospital.email,
                        contactNumber: hospital.contactNumber,
                        status: hospital.status
                    });
                } else {
                    toast.error('No hospital assigned to you. Please contact admin.');
                }
            } catch (error) {
                console.error('Error fetching hospital info:', error);
                toast.error('Failed to load hospital information');
                // Set default fallback
                setHospitalInfo({
                    id: null,
                    name: 'No Hospital Assigned',
                    address: 'N/A',
                    email: 'N/A',
                    contactNumber: 'N/A',
                    status: 'N/A'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchHospitalInfo();
    }, []);

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
                return <ICUMgmt hospitalId={hospitalInfo.id} />;
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
                        {hospitalInfo && hospitalInfo.id ? (
                            <div className={styles.hospitalDetails}>
                                <p><strong>Hospital Name:</strong> {hospitalInfo.name}</p>
                                <p><strong>Hospital ID:</strong> {hospitalInfo.id}</p>
                                <p><strong>Address:</strong> {hospitalInfo.address}</p>
                                <p><strong>Email:</strong> {hospitalInfo.email}</p>
                                <p><strong>Contact:</strong> {hospitalInfo.contactNumber}</p>
                                <p><strong>Status:</strong> <span className={hospitalInfo.status === 'Active' ? styles.statusActive : styles.statusBlocked}>{hospitalInfo.status}</span></p>
                            </div>
                        ) : (
                            <p className={styles.noHospital}>No hospital assigned. Please contact your administrator.</p>
                        )}
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
