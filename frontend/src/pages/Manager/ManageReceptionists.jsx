import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import styles from './ManageReceptionists.module.css';
import API from '../../utils/api';

const ManageReceptionists = () => {
    const [receptionists, setReceptionists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedReceptionist, setSelectedReceptionist] = useState(null);
    const [formData, setFormData] = useState({
        userName: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        gender: 'Male',
        userPass: ''
    });

    useEffect(() => {
        loadReceptionists();
    }, []);

    const loadReceptionists = async () => {
        try {
            setLoading(true);
            const response = await API.get('/manager/receptionists');
            setReceptionists(response.data.data || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load receptionists');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleCreateReceptionist = async (e) => {
        e.preventDefault();
        try {
            await API.post('/manager/create-receptionist', formData);
            toast.success('Receptionist created successfully');
            setShowCreateModal(false);
            resetForm();
            loadReceptionists();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create receptionist');
            console.error(error);
        }
    };

    const handleUpdateReceptionist = async (e) => {
        e.preventDefault();
        try {
            await API.put(`/manager/receptionist/${selectedReceptionist._id}`, {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                gender: formData.gender
            });
            toast.success('Receptionist updated successfully');
            setShowEditModal(false);
            resetForm();
            loadReceptionists();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update receptionist');
            console.error(error);
        }
    };

    const handleDeleteReceptionist = async (receptionistId) => {
        if (!window.confirm('Are you sure you want to delete this receptionist?')) {
            return;
        }

        try {
            await API.delete(`/manager/receptionist/${receptionistId}`);
            toast.success('Receptionist deleted successfully');
            loadReceptionists();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete receptionist');
            console.error(error);
        }
    };

    const openEditModal = (receptionist) => {
        setSelectedReceptionist(receptionist);
        setFormData({
            firstName: receptionist.firstName,
            lastName: receptionist.lastName,
            email: receptionist.email,
            phone: receptionist.phone,
            gender: receptionist.gender
        });
        setShowEditModal(true);
    };

    const resetForm = () => {
        setFormData({
            userName: '',
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            gender: 'Male',
            userPass: ''
        });
        setSelectedReceptionist(null);
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Manage Receptionists</h2>
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                    ➕ Add Receptionist
                </Button>
            </div>

            {loading ? (
                <div className={styles.loading}>Loading receptionists...</div>
            ) : receptionists.length === 0 ? (
                <div className={styles.empty}>
                    <p>No receptionists found. Add one to get started.</p>
                </div>
            ) : (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Gender</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {receptionists.map((receptionist) => (
                                <tr key={receptionist._id}>
                                    <td>{receptionist.userName}</td>
                                    <td>{receptionist.firstName} {receptionist.lastName}</td>
                                    <td>{receptionist.email}</td>
                                    <td>{receptionist.phone}</td>
                                    <td>{receptionist.gender}</td>
                                    <td className={styles.actions}>
                                        <Button 
                                            variant="secondary" 
                                            onClick={() => openEditModal(receptionist)}
                                        >
                                            ✏️ Edit
                                        </Button>
                                        <Button 
                                            variant="danger" 
                                            onClick={() => handleDeleteReceptionist(receptionist._id)}
                                        >
                                            🗑️ Delete
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal */}
            <Modal 
                isOpen={showCreateModal} 
                onClose={() => { setShowCreateModal(false); resetForm(); }}
            >
                <h3>Create New Receptionist</h3>
                <form onSubmit={handleCreateReceptionist} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label>Username *</label>
                        <input
                            type="text"
                            name="userName"
                            value={formData.userName}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>First Name *</label>
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Last Name *</label>
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Email *</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Phone *</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Gender *</label>
                        <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Password *</label>
                        <input
                            type="password"
                            name="userPass"
                            value={formData.userPass}
                            onChange={handleInputChange}
                            required
                            minLength={6}
                        />
                    </div>

                    <div className={styles.modalActions}>
                        <Button type="submit" variant="primary">Create Receptionist</Button>
                        <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={() => { setShowCreateModal(false); resetForm(); }}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Modal */}
            <Modal 
                isOpen={showEditModal} 
                onClose={() => { setShowEditModal(false); resetForm(); }}
            >
                <h3>Edit Receptionist</h3>
                <form onSubmit={handleUpdateReceptionist} className={styles.form}>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>First Name *</label>
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Last Name *</label>
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Email *</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Phone *</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Gender *</label>
                        <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>

                    <div className={styles.modalActions}>
                        <Button type="submit" variant="primary">Update Receptionist</Button>
                        <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={() => { setShowEditModal(false); resetForm(); }}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ManageReceptionists;
