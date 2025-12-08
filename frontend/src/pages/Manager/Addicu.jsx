// src/pages/managerPages/Addicu.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify'; // 1. Import toast
import { registerICUOnServer, getICUSpecializations } from '../../utils/api'; 
import styles from './Addicu.module.css';
import Button from '../../components/common/Button';
import SecureInput from '../../components/common/SecureInput';
import SecureSelect from '../../components/common/SecureSelect';

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
    const [specializations, setSpecializations] = useState([]);

    useEffect(() => {
        const loadSpecs = async () => {
            try {
                const specs = await getICUSpecializations();
                setSpecializations(specs);
                setFormData(prev => ({ ...prev, specialization: specs?.[0] || prev.specialization }));
            } catch (e) {
                console.error('Failed to load ICU specializations', e);
            }
        };
        loadSpecs();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Validate hospitalId before proceeding
        if (!hospitalId || !/^[0-9a-fA-F]{24}$/.test(String(hospitalId))) {
            toast.error('Invalid or missing hospital ID. Please ensure you are assigned to a hospital.');
            return;
        }
        setLoading(true);

        try {
            const statusMap = {
                'AVAILABLE': 'Available',
                'OCCUPIED': 'Occupied',
                'MAINTENANCE': 'Maintenance'
            };

            const payload = {
                // backend expects 'hospital' or 'hospitalId' named 'hospitalId' in controller
                hospitalId,
                room: formData.roomNumber,
                capacity: Number(formData.capacity) || 1,
                specialization: formData.specialization,
                status: statusMap[formData.initialStatus] || 'Available',
                fees: parseFloat(formData.feeStructure) || 100,
                isReserved: false,
            };

            const res = await registerICUOnServer(payload);
            const createdIcu = res?.data?.data || res?.data || { id: Date.now(), ...payload };

            // Use toast for success message
            toast.success(`ICU Room ${formData.roomNumber || payload.room} added successfully!`);
            onIcuRegistered(createdIcu);
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
                    <SecureInput type="text" id="roomNumber" name="roomNumber" value={formData.roomNumber} onChange={handleChange} required disabled={loading} maxLength={50} />
                </div>
                
                <div className={styles.formGroup}>
                    <label htmlFor="specialization">Specialization</label>
                    <select id="specialization" name="specialization" value={formData.specialization} onChange={handleChange} required disabled={loading || specializations.length===0}>
                        {specializations.map(spec => (
                            <option key={spec} value={spec}>{spec}</option>
                        ))}
                    </select>
                </div>
                
                <div className={styles.rowGroup}>
                    <div className={styles.formGroup}>
                        <label htmlFor="capacity">Beds/Capacity</label>
                        <SecureInput type="number" id="capacity" name="capacity" value={formData.capacity} min="1" max="100" onChange={handleChange} required disabled={loading} />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="feeStructure">Daily Fee (EGP)</label>
                        <SecureInput type="number" id="feeStructure" name="feeStructure" value={formData.feeStructure} min="0" max="1000000" onChange={handleChange} required disabled={loading} />
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="initialStatus">Initial Status</label>
                    <SecureSelect 
                        id="initialStatus" 
                        name="initialStatus" 
                        value={formData.initialStatus} 
                        onChange={handleChange} 
                        disabled={loading} 
                        options={[
                            { value: 'AVAILABLE', label: 'AVAILABLE' },
                            { value: 'OCCUPIED', label: 'OCCUPIED' },
                            { value: 'MAINTENANCE', label: 'MAINTENANCE' }
                        ]} 
                    />
                </div>

                <Button type="submit" variant="success" disabled={loading}>
                    {loading ? 'Registering...' : 'Register ICU'}
                </Button>
            </form>
        </div>
    );
};

export default Addicu;