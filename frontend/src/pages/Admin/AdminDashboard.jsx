import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import DashBoardCard from '../../components/common/DashBoardCard.jsx';
import AddHospital from './AddHospital.jsx';
import ViewAllHospital from './ViewAllHospital.jsx';
import SystemLogs from './SystemLogs.jsx';
import styles from './AdminDashboard.module.css';
import Button from '../../components/common/Button';
import AddEmployee from '../../components/manager/AddEmployee.jsx';
import RemoveEmployee from '../../components/manager/RemoveEmployee.jsx';
import { fetchSystemStats, viewAllHospitals } from '../../utils/api';

const iconHospital = <i className="fas fa-hospital-alt"></i>;
const iconEmployee = <i className="fas fa-users"></i>;
const iconTotalIcu = <i className="fas fa-procedures"></i>;
const iconOccupiedIcu = <i className="fas fa-bed-pulse"></i>;

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('viewHospitals');
    const [hospitalUpdateKey, setHospitalUpdateKey] = useState(0);
    const [managerForm, setManagerForm] = useState({ name: '', email: '', password: '', hospitalId: '' });
    const [dashboardStats, setDashboardStats] = useState({
        totalHospitals: 0,
        totalManagers: 8,
        totalEmployees: 124,
        avgRating: 4.2,
        totalIcus: 0,
        occupiedIcus: 0,
        availableIcus: 0
    });
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            setLoadingStats(true);
            try {
                const [statsRes, hospitalsRes] = await Promise.all([
                    fetchSystemStats(),
                    viewAllHospitals()
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
    }, [hospitalUpdateKey]);

    const handleHospitalAdded = (newHospitalData) => {
        setHospitalUpdateKey(prev => prev + 1);
        setActiveTab('viewHospitals');
    };

    const handleManagerChange = (e) => {
        setManagerForm({ ...managerForm, [e.target.name]: e.target.value });
    };

    const handleManagerSubmit = async (e) => {
        e.preventDefault();
        toast.success(`Manager  created and assigned successfully!`);
        setManagerForm({ name: '', email: '', password: '', hospitalId: '' });
    };

    const handleEmployeeAction = (employee, action) => {
        if (action === 'added') {
            toast.success(`Employee "" was successfully added!`);
        }
        if (action === 'removed') {
            toast.error(`Employee "" was removed.`);
        }
    };

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
            case 'systemLogs':
                return <SystemLogs />;
            case 'viewHospitals':
            default:
                return <ViewAllHospital key={hospitalUpdateKey} />;
        }
    };

    return (
        <div className={styles.adminDashboard}>
            <section className="p-4 bg-slate-800 text-gray-100 rounded-xl mb-6">
                <h2 className="text-2xl font-semibold mb-2">👑 Admin Journey</h2>
                <ul className="list-disc ml-6 space-y-1">
                    <li>Login → Access Admin Dashboard</li>
                    <li>Manage users, roles, and permissions</li>
                    <li>View system logs and activity history</li>
                    <li>Generate ICU and staff performance reports</li>
                    <li>Update safety settings and maintenance policies</li>
                    <li>Logout securely</li>
                </ul>
            </section>
            <header className={styles.header}>
                <h1>System Administrator Dashboard</h1>
            </header>
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
                    color="#6f42c1"
                />
                <DashBoardCard 
                    title="Occupied ICUs" 
                    value={loadingStats ? '...' : `${dashboardStats.occupiedIcus} / `}
                    icon={iconOccupiedIcu} 
                    color="#dc3545"
                />
                <DashBoardCard 
                    title="Total Employees" 
                    value={dashboardStats.totalEmployees} 
                    icon={iconEmployee} 
                    color="#17a2b8"
                />
            </section>
            <nav className={styles.tabsNav}>
                <Button className={`${styles.tabButton} `} onClick={() => setActiveTab('viewHospitals')}>
                    Manage Hospitals
                </Button>
                <Button className={`${styles.tabButton} `} onClick={() => setActiveTab('addHospital')}>
                    Add Hospital
                </Button>
                <Button className={`${styles.tabButton} `} onClick={() => setActiveTab('manageEmployees')}>
                    Manage Employees
                </Button>
                <Button className={`${styles.tabButton} `} onClick={() => setActiveTab('manageManagers')}>
                    Add Manager
                </Button>
                <Button className={`${styles.tabButton} `} onClick={() => setActiveTab('systemLogs')}>
                    System Logs
                </Button>
            </nav>
            <section className={styles.contentArea}>
                {renderContent()}
            </section>
        </div>
    );
};

export default AdminDashboard;
