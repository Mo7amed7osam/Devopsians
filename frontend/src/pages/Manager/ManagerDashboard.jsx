import React, { useState, useEffect } from 'react';
import DashBoardCard from '../../components/common/DashBoardCard.jsx';
import Addicu from './Addicu.jsx';
import ICUMgmt from './ICUMgmt.jsx';
import { viewICUsForManager, getManagerHospital } from '../../utils/api';
import styles from './ManagerDashboard.module.css';
import DashboardNav from '../../components/common/DashboardNav';
import { toast } from 'react-toastify';

import { getServiceCategories } from '../../utils/api';

const iconICU = <i className="fas fa-bed"></i>;

const ManagerDashboard = () => {
    const [activeTab, setActiveTab] = useState('icuMgmt');
    const [hospitalInfo, setHospitalInfo] = useState({ id: '', name: '' });
    const [dashboardStats, setDashboardStats] = useState({
        totalICUs: 0,
        availableICUs: 0,
    });
    const [icus, setIcus] = useState([]);
    const [refreshCounter, setRefreshCounter] = useState(0);
    const [loading, setLoading] = useState(false);
    const [serviceCategories, setServiceCategories] = useState([]);
    
        useEffect(() => {
            const loadCategories = async () => {
                try {
                    const cats = await getServiceCategories();
                    setServiceCategories(cats);
                } catch (e) {
                    // non-blocking
                }
            };
            loadCategories();
        }, []);

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

    // Fetch manager-specific data: ICUs
    useEffect(() => {
        // Also fetch the manager's assigned hospital on mount (authoritative source)
        const fetchAssignedHospital = async () => {
            try {
                const res = await getManagerHospital();
                // backend may return { data: hospital } or { data: { data: hospital } }
                {serviceCategories.length > 0 && (
                    <div className={styles.controls} style={{ marginBottom: '1rem' }}>
                        <label style={{ marginRight: 8 }}>Service Category (from model):</label>
                        <select disabled>
                            {serviceCategories.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                )}
                const h = res?.data?.data || res?.data || null;
                if (h) {
                    const hid = h._id || h.id || h;
                    const hname = h.name || '';
                    if (hid) setHospitalInfo({ id: hid, name: hname });
                }
            } catch (err) {
                // If endpoint returns 404 or no hospital, we'll silently fallback to deriving
                // hospital from ICUs later. Log unexpected errors for debugging.
                if (!(err?.response?.status === 404)) {
                    console.error('Failed to fetch assigned hospital', err);
                }
            }
        };
        fetchAssignedHospital();

        const loadManagerData = async () => {
            setLoading(true);
            try {
                // Fetch ICUs visible to manager
                let icuRes;
                try {
                    icuRes = await viewICUsForManager();
                } catch (e) {
                    // If manager endpoint fails, fallback to empty list
                    icuRes = null;
                }

                const icuArray = icuRes?.data?.data || icuRes?.data || [];
                const icusList = Array.isArray(icuArray) ? icuArray : [];
                setIcus(icusList);

                // If we don't have a hospital id yet, try to derive from fetched ICUs
                if ((!hospitalInfo.id || hospitalInfo.id === '') && icusList.length > 0) {
                    const firstHospital = icusList[0]?.hospital;
                    if (firstHospital) {
                        const hid = firstHospital._id || firstHospital.id || firstHospital;
                        const hname = firstHospital.name || hospitalInfo.name || '';
                        setHospitalInfo({ id: hid, name: hname });
                    }
                }

                // Compute stats
                const total = icusList.length;
                const available = icusList.filter(i => (i.status || '').toString().toLowerCase() === 'available').length;
                setDashboardStats(prev => ({ ...prev, totalICUs: total, availableICUs: available }));
            } catch (err) {
                console.error('Failed to load manager data', err);
                toast.error('Failed to load manager data');
            } finally {
                setLoading(false);
            }
        };
        loadManagerData();
    }, [refreshCounter]);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const cats = await getServiceCategories();
                setServiceCategories(cats);
            } catch (e) {
                // non-blocking
            }
        };
        loadCategories();
    }, []);

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
            default:
                return null;
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
