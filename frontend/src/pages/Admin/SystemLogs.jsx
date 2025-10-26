// src/pages/adminPages/SystemLogs.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { fetchSystemLogs } from '../../utils/api';
import styles from './SystemLogs.module.css';

const SystemLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadLogs = async () => {
            setLoading(true);
            try {
                const response = await fetchSystemLogs();
                setLogs(response.data);
            } catch (err) {
                toast.error("Failed to load system logs.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadLogs();
    }, []);

    const formatTimestamp = (isoString) => {
        if (!isoString) return 'N/A';
        try {
            // Simple formatting, consider a library like date-fns for complex needs
            const date = new Date(isoString);
            return date.toLocaleString('en-US', { 
                year: 'numeric', month: 'short', day: 'numeric', 
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
            });
        } catch (e) {
            return isoString; // Fallback
        }
    };

    return (
        <div className={styles.logsContainer}>
            <h3 className={styles.title}>System Activity Log</h3>

            {loading ? (
                <div className={styles.loading}>Loading logs...</div>
            ) : (
                <table className={styles.logTable}>
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>User</th>
                            <th>Action Type</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 ? (
                            <tr><td colSpan="4">No logs found.</td></tr>
                        ) : (
                            logs.map(log => (
                                <tr key={log.id}>
                                    <td>{formatTimestamp(log.timestamp)}</td>
                                    <td>{log.user}</td>
                                    <td><span className={styles.actionBadge}>{log.action.replace('_', ' ')}</span></td>
                                    <td>{log.details}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default SystemLogs;