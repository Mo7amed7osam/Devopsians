// src/components/RemoveEmployee.jsx
import React, { useState } from 'react';
import { toast } from 'react-toastify'; // 1. Import toast
import Button from './Button';

const RemoveEmployee = ({ onEmployeeAction }) => {
  const [identifier, setIdentifier] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // --- This is the new, improved confirmation logic ---
    const performRemove = () => {
        // In a real app: await deleteEmployee(identifier);
        onEmployeeAction(identifier, 'removed');
        toast.success(`Employee "${identifier}" has been removed.`);
        setIdentifier('');
    };

    const ConfirmationToast = ({ closeToast }) => (
        <div>
            <p>Are you sure you want to remove this employee?</p>
            <p><strong>{identifier}</strong></p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                <Button onClick={() => { performRemove(); closeToast(); }} variant="danger">
                    Yes, Remove
                </Button>
                <Button onClick={closeToast} variant="secondary">
                    Cancel
                </Button>
            </div>
        </div>
    );
    
    toast.warn(<ConfirmationToast />, {
        position: "top-center",
        autoClose: false,
        closeOnClick: false,
        draggable: false,
    });
    // --- End of new logic ---
  };

  return (
    <form onSubmit={handleSubmit} className="form-card">
      <h3>Remove Employee</h3>
      <input 
        type="text" 
        value={identifier} 
        onChange={(e) => setIdentifier(e.target.value)} 
        placeholder="Employee ID or Email" 
        required 
      />
      <Button type="submit" variant="danger">
        Remove Employee
      </Button>
    </form>
  );
};

export default RemoveEmployee;