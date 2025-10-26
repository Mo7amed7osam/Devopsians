// src/components/AssignTask.jsx
import React, { useState } from 'react';
import { toast } from 'react-toastify'; // 1. Import toast
import Button from './Button';

const AssignTask = ({ employees = [], onTaskAssigned }) => {
  const [formData, setFormData] = useState({ 
    employeeId: '', description: '', priority: 'Medium', deadline: '' 
  });
  // 2. The 'message' state is no longer needed.
  // const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // MOCK Success:
      const result = { success: true, task: { id: Date.now(), ...formData } }; 

      if (result.success) {
        // 3. Show a success toast notification.
        toast.success(`Task successfully assigned to Employee ID ${formData.employeeId}.`);
        onTaskAssigned(result.task); 
        setFormData({ employeeId: '', description: '', priority: 'Medium', deadline: '' });
      }
    } catch (error) {
      // 4. Show an error toast notification.
      toast.error(`Error assigning task: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-card">
      <h3>Assign Task</h3>
      
      {/* 5. The old message div is removed. */}
      
      <label htmlFor="employeeId">Assign To:</label>
      <select id="employeeId" name="employeeId" value={formData.employeeId} onChange={handleChange} required>
        <option value="">-- Select Employee --</option>
        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>)}
      </select>

      <label htmlFor="description">Description:</label>
      <textarea id="description" name="description" value={formData.description} onChange={handleChange} placeholder="Task details (e.g., Clean Room 302)" required />

      <label htmlFor="priority">Priority:</label>
      <select id="priority" name="priority" value={formData.priority} onChange={handleChange}>
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
      </select>

      <label htmlFor="deadline">Deadline:</label>
      <input type="date" id="deadline" name="deadline" value={formData.deadline} onChange={handleChange} required />
      
      <Button type="submit" variant="primary">
        Assign Task
      </Button>
    </form>
  );
};

export default AssignTask;