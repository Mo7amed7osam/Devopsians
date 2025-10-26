// src/pages/managerPages/Addicu.jsx
import React, { useState } from 'react';
import { toast } from 'react-toastify'; // 1. Import toast
import { registerICU } from '../../utils/api'; 
import styles from './Addicu.module.css';
import Button from '../../components/Button';

const Addicu = ({ hospitalId, onIcuRegistered }) => {
    const [formData, setFormData] = useState({
        roomNumber: '',
        specialization: 'General',
        capacity: 1,
        initialStatus: 'AVAILABLE',
        feeStructure: 500
    });
    // 2. The 'message' state is no longer needed
    // const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);

    const specializations = ['General', 'Cardiology', 'Neurology', 'Pediatrics', 'Neonatal', 'Surgical'];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = { ...formData, hospitalId, capacity: parseInt(formData.capacity) };
            const mockResponse = { data: { id: Date.now(), ...payload } }; // Mock response
            
            // 3. Use toast for success message
            toast.success(`ICU Room ${payload.roomNumber} added successfully!`);
            onIcuRegistered(mockResponse.data);
            setFormData({ roomNumber: '', specialization: 'General', capacity: 1, initialStatus: 'AVAILABLE', feeStructure: 500 });

        } catch (error) {
            console.error('Add ICU Error:', error);
            const errorMessage = error.response?.data?.message || 'Failed to register ICU.';
            // 4. Use toast for error message
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.cardContainer}>
            <h3 className={styles.title}>Register New ICU</h3>
            <p className={styles.hospitalIdLabel}>Hospital ID: **{hospitalId}**</p>

            {/* 5. The old message display is removed from here */}
            
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                    <label htmlFor="roomNumber">Room Number/Identifier</label>
                    <input type="text" id="roomNumber" name="roomNumber" value={formData.roomNumber} onChange={handleChange} required disabled={loading} />
                </div>
                
                <div className={styles.formGroup}>
                    <label htmlFor="specialization">Specialization</label>
                    <select id="specialization" name="specialization" value={formData.specialization} onChange={handleChange} required disabled={loading}>
                        {specializations.map(spec => (
                            <option key={spec} value={spec}>{spec}</option>
                        ))}
                    </select>
                </div>
                
                <div className={styles.rowGroup}>
                    <div className={styles.formGroup}>
                        <label htmlFor="capacity">Beds/Capacity</label>
                        <input type="number" id="capacity" name="capacity" value={formData.capacity} min="1" onChange={handleChange} required disabled={loading} />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="feeStructure">Daily Fee (EGP)</label>
                        <input type="number" id="feeStructure" name="feeStructure" value={formData.feeStructure} onChange={handleChange} required disabled={loading} />
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="initialStatus">Initial Status</label>
                    <select id="initialStatus" name="initialStatus" value={formData.initialStatus} onChange={handleChange} disabled={loading}>
                        <option value="AVAILABLE">AVAILABLE</option>
                        <option value="MAINTENANCE">MAINTENANCE</option>
                    </select>
                </div>

                <Button type="submit" variant="success" disabled={loading}>
                    {loading ? 'Registering...' : 'Register ICU'}
                </Button>
            </form>
        </div>
    );
};

export default Addicu;