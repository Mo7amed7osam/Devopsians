// src/pages/UpdateMedicalDetails.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify'; // 1. Import toast
import { updateMedicalHistory } from '../utils/api';
import styles from './UpdateMedicalDetails.module.css';
import Button from '../components/Button';

const UpdateMedicalDetails = ({ patientId, initialHistory, onUpdateComplete }) => {
    const [history, setHistory] = useState(initialHistory || '');
    // 2. The 'message' state is no longer needed
    // const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setHistory(initialHistory);
    }, [initialHistory]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Mock API Call
            // 3. Show success toast
            toast.success('Medical details updated successfully.');
            if (onUpdateComplete) {
                onUpdateComplete(history);
            }
        } catch (error) {
            // 4. Show error toast
            toast.error('Update failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.cardContainer}>
            <h3 className={styles.title}>Update Medical History</h3>
            
            {/* 5. The old message display is removed from here */}

            <form onSubmit={handleSubmit} className={styles.form}>
                <label className={styles.label} htmlFor="medicalHistory">Current Medical Status & Allergies:</label>
                <textarea 
                    id="medicalHistory"
                    value={history}
                    onChange={(e) => setHistory(e.target.value)}
                    rows="8"
                    required
                    disabled={loading}
                    className={styles.textArea}
                />
                <Button type="submit" disabled={loading} variant="primary">
                    {loading ? 'Saving...' : 'Save Updates'}
                </Button>
            </form>
        </div>
    );
};

export default UpdateMedicalDetails;