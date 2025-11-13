import React, { useState, useEffect } from 'react';
import DashBoardCard from '../../components/common/DashBoardCard.jsx';
import Addicu from './Addicu.jsx';
import ICUMgmt from './ICUMgmt.jsx';
import { viewICUsForManager } from '../../utils/api';
import styles from './ManagerDashboard.module.css';
import DashboardNav from '../../components/common/DashboardNav';

const iconICU = <i className="fas fa-bed"></i>;
const iconTasks = <i className="fas fa-tasks"></i>;
const iconEmployee = <i className="fas fa-user-friends"></i>;

const ManagerDashboard = () => {
    const [activeTab, setActiveTab] = useState('icuMgmt');
    const [hospitalInfo, setHospitalInfo] = useState({ id: 'HOSP_XYZ', name: 'General City Clinic' });
    const [dashboardStats, setDashboardStats] = useState({
        totalICUs: 0,
        availableICUs: 0,
    });
    const [icus, setIcus] = useState([]);
    const [refreshCounter, setRefreshCounter] = useState(0);
    const [loading, setLoading] = useState(false);
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
    ];

    // Fetch manager-specific data: ICUs and assigned employees
    useEffect(() => {
        const loadManagerData = async () => {
            setLoading(true);
            try {
                // Fetch ICUs visible to manager
                let icuRes;
                try {
                    icuRes = await viewICUsForManager();
                } catch (e) {
                    // If manager endpoint requires query, fallback to empty list
                    icuRes = null;
                }

                const icuArray = icuRes?.data?.data || icuRes?.data || [];
                setIcus(Array.isArray(icuArray) ? icuArray : []);

                // Compute stats
                const total = Array.isArray(icuArray) ? icuArray.length : 0;
                const available = Array.isArray(icuArray)
                    ? icuArray.filter(i => (i.status || '').toString().toLowerCase() === 'available').length
                    : 0;
                setDashboardStats(prev => ({ ...prev, totalICUs: total, availableICUs: available }));
            } catch (err) {
                console.error('Failed to load manager data', err);
            } finally {
                setLoading(false);
            }
        };
        loadManagerData();
    }, []);
    const renderContent = () => {
        switch (activeTab) {
            case 'icuMgmt':
                return <ICUMgmt hospitalId={hospitalInfo.id} refresh={refreshCounter} />;
            case 'addIcu':
                return <Addicu hospitalId={hospitalInfo.id} onIcuRegistered={handleIcuRegistered} />;
        }
    };
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
