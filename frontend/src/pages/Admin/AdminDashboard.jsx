import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import DashBoardCard from '../../components/common/DashBoardCard.jsx';
import AddHospital from './AddHospital.jsx';
import ViewAllHospital from './ViewAllHospital.jsx';
import Modal from '../../components/common/Modal';
import styles from './AdminDashboard.module.css';
import Button from '../../components/common/Button';
// Employee management moved to Manager dashboard
import { fetchSystemStats, viewAllHospitals, createManagerAccount, createUserAccount, viewAllManagers, viewAllAdmins, deleteUserById, blockUserById, unblockUserById, updateUserById } from '../../utils/api';

const iconHospital = <i className="fas fa-hospital-alt"></i>;
const iconEmployee = <i className="fas fa-users"></i>;
const iconTotalIcu = <i className="fas fa-procedures"></i>;
const iconOccupiedIcu = <i className="fas fa-bed-pulse"></i>;

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('viewHospitals');
    const [hospitalUpdateKey, setHospitalUpdateKey] = useState(0);
    const [openHospitalId, setOpenHospitalId] = useState('');
    const [managerForm, setManagerForm] = useState({ name: '', email: '', password: '', hospitalId: '', phone: '', gender: 'Male' });
    const [hospitalsList, setHospitalsList] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
        const [isEditingUser, setIsEditingUser] = useState(false);
            const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: '', password: '' });
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [createUserForm, setCreateUserForm] = useState({ firstName: '', lastName: '', userName: '', email: '', password: '', role: 'Manager', phone: '', gender: 'Male', assignedHospital: '' });
    const [dashboardStats, setDashboardStats] = useState({
        totalHospitals: 0,
        totalManagers: 8,
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
                // Fetch system stats, hospitals, and user lists to compute counts
                const [statsRes, hospitalsRes, managersRes, adminsRes] = await Promise.all([
                    fetchSystemStats().catch(err => {
                        console.warn('Failed to fetch system stats:', err.response?.status || err.message);
                        return { data: { totalIcus: 0, occupiedIcus: 0, availableIcus: 0 } };
                    }),
                    viewAllHospitals().catch(err => {
                        console.warn('Failed to fetch hospitals:', err.response?.status || err.message);
                        return { data: [] };
                    }),
                    viewAllManagers().catch(err => {
                        console.warn('Failed to fetch managers:', err.response?.status || err.message);
                        return { data: [] };
                    }),
                    viewAllAdmins().catch(err => {
                        console.warn('Failed to fetch admins:', err.response?.status || err.message);
                        return { data: [] };
                    }),
                ]);

                const hospitalsArray = Array.isArray(hospitalsRes.data) ? hospitalsRes.data : hospitalsRes.data?.hospitals || hospitalsRes.data?.hospitalsList || [];

                // Normalize manager/admin response shapes
                const managersArrayForStats = Array.isArray(managersRes?.data)
                    ? managersRes.data
                    : (managersRes?.data?.data || managersRes?.data?.managers || managersRes?.data || []);
                const adminsArrayForStats = Array.isArray(adminsRes?.data)
                    ? adminsRes.data
                    : (adminsRes?.data?.data || adminsRes?.data?.admins || adminsRes?.data || []);

                setDashboardStats({
                    totalHospitals: hospitalsArray.length || 0,
                    totalIcus: statsRes?.data?.totalIcus ?? 0,
                    occupiedIcus: statsRes?.data?.occupiedIcus ?? 0,
                    availableIcus: statsRes?.data?.availableIcus ?? 0,
                    totalManagers: managersArrayForStats.length || 0
                });

                // Populate hospitals dropdown
                setHospitalsList(hospitalsArray);
                // optionally populate usersList basic cache
                try {
                    const managersArray = Array.isArray(managersRes?.data)
                        ? managersRes.data
                        : (managersRes?.data?.data || managersRes?.data?.managers || managersRes?.data || []);
                    const adminsArray = Array.isArray(adminsRes?.data)
                        ? adminsRes.data
                        : (adminsRes?.data?.data || adminsRes?.data?.admins || adminsRes?.data || []);

                    const combined = [
                        ...managersArray.map(m => ({ ...m, role: m.role || 'Manager', id: m._id || m.id })),
                        ...adminsArray.map(a => ({ ...a, role: a.role || 'Admin', id: a._id || a.id })),
                    ];
                    setUsersList(combined);
                } catch (err) {
                    // ignore user list populate errors
                }
            } catch (err) {
                toast.error("Failed to load dashboard statistics.");
                console.error(err);
            } finally {
                setLoadingStats(false);
            }
        };
        loadStats();
    }, [hospitalUpdateKey]);

    // Fetch users on demand when Manage Users tab is active
    useEffect(() => {
        const loadUsers = async () => {
            if (activeTab !== 'manageUsers') return;
            try {
                const [managersRes, adminsRes] = await Promise.all([
                    viewAllManagers().catch(() => ({ data: [] })),
                    viewAllAdmins().catch(() => ({ data: [] })),
                ]);
                const managersArray = Array.isArray(managersRes?.data)
                    ? managersRes.data
                    : (managersRes?.data?.data || managersRes?.data?.managers || managersRes?.data || []);
                const adminsArray = Array.isArray(adminsRes?.data)
                    ? adminsRes.data
                    : (adminsRes?.data?.data || adminsRes?.data?.admins || adminsRes?.data || []);
                const combined = [
                    ...managersArray.map(m => ({ ...m, role: m.role || 'Manager', id: m._id || m.id })),
                    ...adminsArray.map(a => ({ ...a, role: a.role || 'Admin', id: a._id || a.id })),
                ];
                setUsersList(combined);
            } catch (err) {
                console.error('Failed to load users', err);
                toast.error('Failed to load users');
            }
        };
        loadUsers();
    }, [activeTab]);

    const openUserModal = (user) => {
        setSelectedUser(user);
        setIsUserModalOpen(true);
        setIsEditingUser(false);
        setEditForm({ firstName: user.firstName || '', lastName: user.lastName || '', email: user.email || '', phone: user.phone || '', role: user.role || '', password: '' });
    };

    const handleDeleteUser = async (user) => {
        if (!user || !user.id) return;
        const performDelete = async () => {
            try {
                await deleteUserById(user.id);
                setUsersList(prev => prev.filter(u => (u.id || u._id) !== user.id));
                toast.success(`User ${user.firstName || user.userName || ''} deleted.`);
                setIsUserModalOpen(false);
                // Reload stats to update counters
                loadStats();
            } catch (err) {
                console.error('Delete user failed', err);
                toast.error('Failed to delete user.');
            }
        };

        const Confirm = ({ closeToast }) => (
            <div>
                <p>Delete user {user.firstName || user.userName}? This cannot be undone.</p>
                <Button onClick={async () => { await performDelete(); closeToast(); }} variant="danger" style={{ marginRight: 8 }}>Yes, delete</Button>
                <Button onClick={closeToast} variant="secondary">Cancel</Button>
            </div>
        );

        toast.warn(<Confirm />, { autoClose: false, closeOnClick: false, draggable: false });
    };

    const handleBlockToggleUser = async (user) => {
        if (!user || !user.id) return;
        const userId = user.id;
        const currentlyBlocked = user.isBlocked || user.blocked || false;
        try {
            if (currentlyBlocked) {
                await unblockUserById(userId);
            } else {
                await blockUserById(userId);
            }
            setUsersList(prev => prev.map(u => (u.id === userId ? { ...u, isBlocked: !currentlyBlocked } : u)));
            toast.success(`User ${currentlyBlocked ? 'unblocked' : 'blocked'} successfully.`);
        } catch (err) {
            console.error('Block toggle failed', err);
            toast.error('Failed to update user status.');
        }
    };

    const handleEditChange = (e) => setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleCreateUserChange = (e) => setCreateUserForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleCreateUserSubmit = async (e) => {
        e.preventDefault();
        
        // Validate required fields
        if (!createUserForm.firstName || !createUserForm.lastName || !createUserForm.password || !createUserForm.role) {
            toast.error('Please fill in all required fields (First Name, Last Name, Password, Role)');
            return;
        }
        
        if (createUserForm.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        
        try {
            await createUserAccount(createUserForm);
            toast.success(`${createUserForm.role} created successfully!`);
            setCreateUserForm({ firstName: '', lastName: '', userName: '', email: '', password: '', role: 'Manager', phone: '', gender: 'Male', assignedHospital: '' });
            setIsCreatingUser(false);
            // Reload users list
            if (activeTab === 'manageUsers') {
                const [managersRes, adminsRes] = await Promise.all([
                    viewAllManagers().catch(() => ({ data: [] })),
                    viewAllAdmins().catch(() => ({ data: [] })),
                ]);
                const managersArray = Array.isArray(managersRes?.data)
                    ? managersRes.data
                    : (managersRes?.data?.data || managersRes?.data?.managers || managersRes?.data || []);
                const adminsArray = Array.isArray(adminsRes?.data)
                    ? adminsRes.data
                    : (adminsRes?.data?.data || adminsRes?.data?.admins || adminsRes?.data || []);
                const combined = [
                    ...managersArray.map(m => ({ ...m, role: m.role || 'Manager', id: m._id || m.id })),
                    ...adminsArray.map(a => ({ ...a, role: a.role || 'Admin', id: a._id || a.id })),
                ];
                setUsersList(combined);
            }
            // Reload stats to update counters
            loadStats();
        } catch (err) {
            console.error('Create user failed:', err.response?.data || err);
            const serverMsg = err?.response?.data?.message || err?.message;
            toast.error(`Failed to create user: ${serverMsg}`);
        }
    };

    const handleSaveUser = async () => {
        if (!selectedUser || !selectedUser.id) return;
        try {
            const payload = { firstName: editForm.firstName, lastName: editForm.lastName, email: editForm.email, phone: editForm.phone, role: editForm.role };
            // include password only if admin entered a new one
            if (editForm.password && editForm.password.trim().length >= 6) {
                payload.password = editForm.password;
            }
            const res = await updateUserById(selectedUser.id, payload);
            // optimistic update
            setUsersList(prev => prev.map(u => (u.id === selectedUser.id ? { ...u, ...payload } : u)));
            toast.success('User updated successfully.');
            setIsEditingUser(false);
            setIsUserModalOpen(false);
            // Reload stats to update counters
            loadStats();
        } catch (err) {
            console.error('Update user failed', err);
            toast.error('Failed to update user.');
        }
    };

    const handleHospitalAdded = (newHospitalData) => {
        setHospitalUpdateKey(prev => prev + 1);
        setActiveTab('viewHospitals');
        // Reload stats to update hospital counter
        loadStats();
    };

    const handleManagerChange = (e) => {
        setManagerForm({ ...managerForm, [e.target.name]: e.target.value });
    };

    const handleManagerSubmit = async (e) => {
        e.preventDefault();
        try {
            // Create manager account - backend expects userName and password
            const nameParts = managerForm.name.trim().split(' ').filter(Boolean);
            const firstName = nameParts[0] || managerForm.name;
            // backend requires a lastName; provide a sensible default if user entered a single name
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Manager';
            const userName = managerForm.email ? managerForm.email.split('@')[0] : `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;

            const managerPayload = {
                firstName,
                lastName,
                userName,
                password: managerForm.password,
                hospitalId: managerForm.hospitalId || undefined,
                phone: managerForm.phone || undefined,
                gender: managerForm.gender || undefined,
                email: managerForm.email || undefined,
            };

            // Create manager and optionally assign in one request
            const createRes = await createManagerAccount(managerPayload);

            const assignedHospital = createRes?.data?.data?.assignedHospital || null;

            toast.success(`Manager created${managerForm.hospitalId ? ' and assigned' : ''} successfully!`);
            setManagerForm({ name: '', email: '', password: '', hospitalId: '', phone: '', gender: 'Male' });
            setHospitalUpdateKey(prev => prev + 1);

            // If backend returned assignedHospital, switch to viewHospitals and open its modal
            if (assignedHospital && assignedHospital.id) {
                setActiveTab('viewHospitals');
                // small delay to ensure ViewAllHospital reloads data
                setTimeout(() => setOpenHospitalId(assignedHospital.id), 300);
            }
        } catch (err) {
            console.error('Create/assign manager failed', err, err?.response?.data);
            const serverMsg = err?.response?.data?.message || err?.response?.data?.error || err.message;
            toast.error(serverMsg || 'Failed to create or assign manager.');
        }
    };

    // NOTE: per-row action removed; assignment is handled from the modal or Add Manager tab.
    // Called when the hospital modal requests assigning/changing a manager.
    function handleAssignManagerFromList(hospitalId) {
        // Pre-select the hospital in the manager form and switch to manager tab
        setManagerForm(prev => ({ ...prev, hospitalId: hospitalId || '' }));
        setActiveTab('manageManagers');
    }
    // Employee actions are handled in Manager dashboard

    const renderContent = () => {
        switch (activeTab) {
            case 'addHospital':
                return <AddHospital onHospitalAdded={handleHospitalAdded} />;
            case 'manageManagers':
                return (
                    <form onSubmit={handleManagerSubmit} className={styles.formCard}>
                        <h3 className={styles.formTitle}>Add & Assign Manager</h3>
                        <input type="text" name="name" value={managerForm.name ?? ''} onChange={handleManagerChange} placeholder="Name" required />
                        <input type="email" name="email" value={managerForm.email ?? ''} onChange={handleManagerChange} placeholder="Email" required />
                        <input type="password" name="password" value={managerForm.password ?? ''} onChange={handleManagerChange} placeholder="Initial Password" required />
                        <input type="tel" name="phone" value={managerForm.phone ?? ''} onChange={handleManagerChange} placeholder="Phone (optional)" />
                        <label htmlFor="gender">Gender</label>
                        <select name="gender" id="gender" value={managerForm.gender} onChange={handleManagerChange}>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                        <label htmlFor="hospitalId">Assign to Hospital</label>
                        <select name="hospitalId" id="hospitalId" value={managerForm.hospitalId} onChange={handleManagerChange} required>
                            <option value="">Select a hospital...</option>
                            {hospitalsList.map(h => (
                                <option key={h._id || h.id} value={h._id || h.id}>{h.name || h.address || (h.email || 'Unnamed Hospital')}</option>
                            ))}
                        </select>
                        <Button type="submit" variant="primary">Add & Assign Manager</Button>
                    </form>
                );
            case 'manageUsers':
                return (
                    <div className={styles.usersPanel}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 className={styles.formTitle}>Manage Users</h3>
                            <Button variant="primary" onClick={() => setIsCreatingUser(true)}>+ Create User</Button>
                        </div>
                        {isCreatingUser && (
                            <Modal isOpen={isCreatingUser} onClose={() => setIsCreatingUser(false)} contentLabel="create-user">
                                <form onSubmit={handleCreateUserSubmit} className={styles.createUserForm}>
                                    <div className={styles.formHeader}>
                                        <h3>Create New User</h3>
                                        <p>Fill in the details to create a new user account</p>
                                    </div>
                                    
                                    <div className={styles.formGrid}>
                                        <div className={styles.formGroup}>
                                            <label>First Name <span className={styles.required}>*</span></label>
                                            <input name="firstName" value={createUserForm.firstName} onChange={handleCreateUserChange} placeholder="Enter first name" required />
                                        </div>
                                        
                                        <div className={styles.formGroup}>
                                            <label>Last Name <span className={styles.required}>*</span></label>
                                            <input name="lastName" value={createUserForm.lastName} onChange={handleCreateUserChange} placeholder="Enter last name" required />
                                        </div>
                                        
                                        <div className={styles.formGroup}>
                                            <label>Username</label>
                                            <input name="userName" value={createUserForm.userName} onChange={handleCreateUserChange} placeholder="Enter username (optional)" />
                                        </div>
                                        
                                        <div className={styles.formGroup}>
                                            <label>Email</label>
                                            <input name="email" type="email" value={createUserForm.email} onChange={handleCreateUserChange} placeholder="Enter email (optional)" />
                                        </div>
                                        
                                        <div className={styles.formGroup}>
                                            <label>Password <span className={styles.required}>*</span></label>
                                            <input name="password" type="password" value={createUserForm.password} onChange={handleCreateUserChange} placeholder="Min 6 characters" required minLength={6} />
                                        </div>
                                        
                                        <div className={styles.formGroup}>
                                            <label>Phone</label>
                                            <input name="phone" value={createUserForm.phone} onChange={handleCreateUserChange} placeholder="Enter phone number" />
                                        </div>
                                        
                                        <div className={styles.formGroup}>
                                            <label>Gender</label>
                                            <select name="gender" value={createUserForm.gender} onChange={handleCreateUserChange}>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                            </select>
                                        </div>
                                        
                                        <div className={styles.formGroup}>
                                            <label>Role <span className={styles.required}>*</span></label>
                                            <select name="role" value={createUserForm.role} onChange={handleCreateUserChange} required>
                                                <option value="Admin">Admin</option>
                                                <option value="Manager">Manager</option>
                                                <option value="Receptionist">Receptionist</option>
                                                <option value="Ambulance">Ambulance</option>
                                                <option value="Patient">Patient</option>
                                            </select>
                                        </div>
                                        
                                        {(createUserForm.role === 'Receptionist' || createUserForm.role === 'Ambulance' || createUserForm.role === 'Manager') && (
                                            <div className={styles.formGroupFull}>
                                                <label>Assign to Hospital</label>
                                                <select name="assignedHospital" value={createUserForm.assignedHospital} onChange={handleCreateUserChange}>
                                                    <option value="">-- Select Hospital (Optional) --</option>
                                                    {hospitalsList.map(h => (
                                                        <option key={h._id || h.id} value={h._id || h.id}>{h.name || h.address}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className={styles.formActions}>
                                        <Button type="button" variant="secondary" onClick={() => setIsCreatingUser(false)}>Cancel</Button>
                                        <Button type="submit" variant="primary">Create User</Button>
                                    </div>
                                </form>
                            </Modal>
                        )}
                        <div className={styles.usersTableWrap}>
                            <table className={styles.usersTable}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Created</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usersList.map((u, i) => (
                                        <tr key={u.id || i}>
                                            <td>{u.firstName ? `${u.firstName} ${u.lastName || ''}` : (u.userName || 'User')}</td>
                                            <td>{u.email || '—'}</td>
                                            <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                                            <td>{u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}</td>
                                            <td style={{ display: 'flex', gap: 8 }}>
                                                <Button size="small" variant="secondary" onClick={() => openUserModal(u)}>View</Button>
                                                <Button size="small" variant="primary" onClick={() => { setSelectedUser(u); setIsEditingUser(true); setEditForm({ firstName: u.firstName || '', lastName: u.lastName || '', email: u.email || '', phone: u.phone || '', role: u.role || '', password: '' }); setIsUserModalOpen(true); }}>Edit</Button>
                                                <Button size="small" variant="danger" onClick={() => handleDeleteUser(u)}>Delete</Button>
                                                <Button size="small" variant="secondary" onClick={() => handleBlockToggleUser(u)}>{(u.isBlocked || u.blocked) ? 'Unblock' : 'Block'}</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {selectedUser && (
                            <Modal isOpen={isUserModalOpen} onClose={() => { setIsUserModalOpen(false); setIsEditingUser(false); }} contentLabel={`user-${selectedUser.id}`}>
                                <div className={styles.modalHeader}>
                                    <h2>{selectedUser.firstName} {selectedUser.lastName}</h2>
                                    <p>ID: {selectedUser.id}</p>
                                </div>
                                <div className={styles.modalBody}>
                                    {!isEditingUser ? (
                                        <>
                                            <p><strong>Email:</strong> {selectedUser.email || 'N/A'}</p>
                                            <p><strong>Phone:</strong> {selectedUser.phone || 'N/A'}</p>
                                            <p><strong>Role:</strong> {selectedUser.role}</p>
                                            <p><strong>Joined:</strong> {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : 'N/A'}</p>
                                        </>
                                    ) : (
                                        <form onSubmit={(e) => { e.preventDefault(); handleSaveUser(); }} className={styles.createUserForm}>
                                            <div className={styles.formHeader}>
                                                <h3>Edit User</h3>
                                                <p>Update user details below</p>
                                            </div>
                                            
                                            <div className={styles.formGrid}>
                                                <div className={styles.formGroup}>
                                                    <label>First Name <span className={styles.required}>*</span></label>
                                                    <input name="firstName" value={editForm.firstName ?? ''} onChange={handleEditChange} placeholder="Enter first name" required />
                                                </div>
                                                
                                                <div className={styles.formGroup}>
                                                    <label>Last Name <span className={styles.required}>*</span></label>
                                                    <input name="lastName" value={editForm.lastName ?? ''} onChange={handleEditChange} placeholder="Enter last name" required />
                                                </div>
                                                
                                                <div className={styles.formGroup}>
                                                    <label>Email</label>
                                                    <input name="email" type="email" value={editForm.email ?? ''} onChange={handleEditChange} placeholder="Enter email" />
                                                </div>
                                                
                                                <div className={styles.formGroup}>
                                                    <label>Phone</label>
                                                    <input name="phone" value={editForm.phone ?? ''} onChange={handleEditChange} placeholder="Enter phone number" />
                                                </div>
                                                
                                                <div className={styles.formGroup}>
                                                    <label>New Password</label>
                                                    <input name="password" type="password" value={editForm.password ?? ''} onChange={handleEditChange} placeholder="Leave blank to keep current" />
                                                </div>
                                                
                                                <div className={styles.formGroup}>
                                                    <label>Role <span className={styles.required}>*</span></label>
                                                    <select name="role" value={editForm.role} onChange={handleEditChange} required>
                                                        <option value="Admin">Admin</option>
                                                        <option value="Manager">Manager</option>
                                                        <option value="Receptionist">Receptionist</option>
                                                        <option value="Ambulance">Ambulance</option>
                                                        <option value="Patient">Patient</option>
                                                    </select>
                                                </div>
                                            </div>
                                            
                                            <div className={styles.formActions}>
                                                <Button type="button" variant="secondary" onClick={() => setIsEditingUser(false)}>Cancel</Button>
                                                <Button type="submit" variant="primary">Save Changes</Button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                                <div className={styles.modalActions}>
                                    <Button size="small" variant={(selectedUser.isBlocked || selectedUser.blocked) ? 'success' : 'secondary'} onClick={() => handleBlockToggleUser(selectedUser)}>
                                        {(selectedUser.isBlocked || selectedUser.blocked) ? 'Unblock' : 'Block'}
                                    </Button>
                                    <Button size="small" variant="danger" onClick={() => handleDeleteUser(selectedUser)}>Delete User</Button>
                                </div>
                            </Modal>
                        )}
                    </div>
                );
            /* Employee management moved to Manager dashboard */
            case 'systemLogs':
                return <SystemLogs />;
            case 'viewHospitals':
            default:
                // Pass a stable inline handler to avoid potential undefined reference
                return (
                    <ViewAllHospital
                        key={hospitalUpdateKey}
                        onAssignManager={(hospitalId) => {
                            // Pre-select the hospital in the manager form and switch to manager tab
                            setManagerForm(prev => ({ ...prev, hospitalId: hospitalId || '' }));
                            setActiveTab('manageManagers');
                        }}
                    />
                );
        }
    };

    return (
        <div className={styles.adminDashboard}>
            <header className={styles.header}>
                <h1>System Administrator Dashboard</h1>
            </header>
            <section className={styles.statsGrid}>
                <DashBoardCard 
                    title="Total Hospitals" 
                    value={loadingStats ? '...' : (dashboardStats.totalHospitals || 0)} 
                    icon={iconHospital} 
                    color="#007bff"
                />
                <DashBoardCard 
                    title="Total ICUs (System)" 
                    value={loadingStats ? '...' : (dashboardStats.totalIcus || 0)} 
                    icon={iconTotalIcu} 
                    color="#6f42c1"
                />
                <DashBoardCard 
                    title="Occupied ICUs" 
                    value={loadingStats ? '...' : `${dashboardStats.occupiedIcus || 0} / ${dashboardStats.totalIcus || 0}`}
                    icon={iconOccupiedIcu} 
                    color="#dc3545"
                />
            </section>
            <nav className={styles.tabsNav}>
                <Button className={`${styles.tabButton} `} variant="secondary" onClick={() => setActiveTab('viewHospitals')} aria-label="Manage Hospitals">
                    Manage Hospitals
                </Button>
                <Button className={`${styles.tabButton} `} variant="primary" onClick={() => setActiveTab('addHospital')} aria-label="Add Hospital">
                    + Add Hospital
                </Button>
                {/* Employee management moved to the Manager dashboard */}
                <Button className={`${styles.tabButton} `} variant="primary" onClick={() => setActiveTab('manageManagers')} aria-label="Add Manager">
                    + Add Manager
                </Button>
                <Button className={`${styles.tabButton} `} variant="secondary" onClick={() => setActiveTab('manageUsers')} aria-label="Manage Users">
                    Manage Users
                </Button>
            </nav>
            <section className={styles.contentArea}>
                {renderContent()}
            </section>
        </div>
    );
};

export default AdminDashboard;
