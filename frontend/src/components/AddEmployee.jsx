// src/components/AddEmployee.jsx
import React, { useState } from 'react';
import Button from './Button';

const AddEmployee = ({ onEmployeeAction }) => {
  const [formData, setFormData] = useState({ 
    name: '', email: '', role: 'nurse', password: '', department: '' // Added department
  });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    onEmployeeAction({ ...formData, id: Date.now() }, 'added');
    setFormData({ name: '', email: '', role: 'nurse', password: '', department: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="form-card">
      <h3>Add New Employee</h3>
      <input type="text" name="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Full Name" required />
      <input type="email" name="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="Email Address" required />
      <input type="password" name="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="Initial Password" required />
      
      {/* --- NEW Department Field --- */}
      <select name="department" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} required>
        <option value="">-- Select Department --</option>
        <option value="Cardiology">Cardiology</option>
        <option value="Neurology">Neurology</option>
        <option value="General">General Medicine</option>
        <option value="Maintenance">Maintenance</option>
        <option value="Administration">Administration</option>
      </select>

      <select name="role" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
        <option value="nurse">Nurse</option>
        <option value="doctor">Doctor</option>
        <option value="cleaner">Cleaner</option>
        <option value="receptionist">Receptionist</option>
      </select>
      <Button type="submit" variant="primary">
        Add Employee
      </Button>
    </form>
  );
};
export default AddEmployee;