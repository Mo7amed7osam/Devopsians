// src/components/TrackEmployeeTasks.jsx
import React, { useState, useEffect } from 'react';
// import { fetchManagerTasks } from '../utils/api';

// This component tracks all tasks assigned by the manager, showing status updates
const TrackEmployeeTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      // Fetch all tasks managed by this manager's hospital
      try {
        // MOCK DATA:
        const mockTasks = [
          { id: 1, employeeName: 'Nurse Jane', description: 'Monitor Patient 101', status: 'IN_PROGRESS', role: 'Nurse' },
          { id: 2, employeeName: 'Cleaner Bob', description: 'Sterilize Room 2A', status: 'DONE', role: 'Cleaner' },
          { id: 3, employeeName: 'Doctor Smith', description: 'Schedule meds for Patient 203', status: 'PENDING', role: 'Doctor' },
        ];
        
        // 1. Call API: const response = await fetchManagerTasks();
        // setTasks(response.data);
        setTasks(mockTasks);
      } catch (error) {
        console.error("Failed to load tasks:", error);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, []);

  if (loading) return <div>Loading tasks list...</div>;

  return (
    <div className="task-tracker-container card-panel">
      <h3>Active Task Overview</h3>
      {tasks.length === 0 ? (
        <p>No active tasks are currently being tracked.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Role</th>
              <th>Task</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => (
              <tr key={task.id}>
                <td>{task.employeeName}</td>
                <td>{task.role}</td>
                <td>{task.description}</td>
                <td className={`status-${task.status.toLowerCase()}`}>{task.status.replace('_', ' ')}</td>
                <td>
                  <button className="btn-small">View Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
export default TrackEmployeeTasks;