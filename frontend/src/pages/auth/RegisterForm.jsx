// // src/pages/RegisterForm.jsx
// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { registerPatient } from '../utils/api';
// import styles from './RegisterForm.module.css'; // Correct CSS file reference

// const RegisterForm = () => {
//     const [formData, setFormData] = useState({
//         name: '', email: '', password: '', medicalHistory: '', currentCondition: ''
//     });
//     const [message, setMessage] = useState('');
//     const [loading, setLoading] = useState(false);
//     const navigate = useNavigate();

//     const handleChange = (e) => {
//         setFormData({ ...formData, [e.target.name]: e.target.value });
//     };

//     const handleRegister = async (e) => {
//         e.preventDefault();
//         setMessage('');
//         setLoading(true);

//         try {
//             await registerPatient(formData); 
//             setMessage('Registration successful! Please log in with your new credentials.');
//             setTimeout(() => navigate('/login'), 3000);
//         } catch (err) {
//             setMessage(err.response?.data?.message || 'Registration failed. Please check input or contact support.');
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <div className={styles.container}>
//             <form onSubmit={handleRegister} className={styles.formCard}>
//                 <h2 className={styles.title}>Patient Sign-Up</h2>
//                 {message && <div className={message.includes('successful') ? styles.successMessage : styles.errorMessage}>{message}</div>}

//                 <label className={styles.label}>Full Name:</label>
//                 <input type="text" name="name" value={formData.name} onChange={handleChange} required className={styles.inputField} />
                
//                 <label className={styles.label}>Email:</label>
//                 <input type="email" name="email" value={formData.email} onChange={handleChange} required className={styles.inputField} />
                
//                 <label className={styles.label}>Password:</label>
//                 <input type="password" name="password" value={formData.password} onChange={handleChange} required className={styles.inputField} />
                
//                 <h3 className={styles.subtitle}>Medical Details</h3>
//                 <label className={styles.label}>Medical History (Allergies, etc.):</label>
//                 <textarea name="medicalHistory" value={formData.medicalHistory} onChange={handleChange} placeholder="List allergies, chronic conditions, and past surgeries." className={styles.textArea} />
                
//                 <label className={styles.label}>Current Condition (Required for ICU):</label>
//                 <textarea name="currentCondition" value={formData.currentCondition} onChange={handleChange} placeholder="Describe current critical condition." required className={styles.textArea} />
                
//                 <button type="submit" disabled={loading} className={styles.registerButton}>
//                     {loading ? 'Submitting...' : 'Register Account'}
//                 </button>
//                 <p className={styles.loginPrompt}>Already have an account? <Link to="/login">Login here</Link>.</p>
//             </form>
//         </div>
//     );
// };
// export default RegisterForm;

// src/pages/RegisterForm.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerPatient } from '../../utils/api';
import { safeNavigate } from '../../utils/security';
import styles from './RegisterForm.module.css'; // <-- 1. Updated import
import Button from '../../components/common/Button'; // <-- 2. Import Button
import SecureInput from '../../components/common/SecureInput';
import SecureTextarea from '../../components/common/SecureTextarea';
import SecureSelect from '../../components/common/SecureSelect';

const RegisterForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        gender: 'Male',
        phone: '',
        medicalHistory: '',
        currentCondition: ''
    });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setMessage('');
        setLoading(true);

        try {
            await registerPatient(formData);
            setMessage('Registration successful! Please log in with your new credentials.');
            setTimeout(() => safeNavigate(navigate, '/login'), 3000);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Registration failed. Please check input or contact support.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <form onSubmit={handleRegister} className={styles.formCard}>
                <h2 className={styles.title}>Patient Sign-Up</h2>
                {message && <div className={message.includes('successful') ? styles.successMessage : styles.errorMessage}>{message}</div>}

                <label className={styles.label}>Full Name:</label>
                <SecureInput 
                    type="text" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    required 
                    className={styles.inputField}
                    maxLength={100}
                    placeholder="Enter your full name"
                />
                
                <label className={styles.label}>Email:</label>
                <SecureInput 
                    type="email" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    required 
                    className={styles.inputField}
                    validateEmail={true}
                    placeholder="your.email@example.com"
                />
                
                <label className={styles.label}>Password:</label>
                <SecureInput 
                    type="password" 
                    name="password" 
                    value={formData.password} 
                    onChange={handleChange} 
                    required 
                    className={styles.inputField}
                    maxLength={128}
                    placeholder="Min 6 characters"
                />

                <div className={styles.row}>
                    <div className={styles.col}>
                        <label className={styles.label}>Gender:</label>
                        <SecureSelect 
                            name="gender" 
                            value={formData.gender} 
                            onChange={handleChange} 
                            className={styles.inputField}
                            options={['Male', 'Female']}
                        />
                    </div>
                    <div className={styles.col}>
                        <label className={styles.label}>Phone:</label>
                        <SecureInput 
                            type="tel" 
                            name="phone" 
                            value={formData.phone} 
                            onChange={handleChange} 
                            placeholder="e.g., 01001234567" 
                            className={styles.inputField}
                            validatePhone={true}
                        />
                    </div>
                </div>
                
                <h3 className={styles.subtitle}>Medical Details</h3>
                <label className={styles.label}>Medical History (Allergies, etc.):</label>
                <SecureTextarea 
                    name="medicalHistory" 
                    value={formData.medicalHistory} 
                    onChange={handleChange} 
                    placeholder="List allergies, chronic conditions, and past surgeries." 
                    className={styles.textArea}
                    maxLength={2000}
                />
                
                <label className={styles.label}>Current Condition (Required for ICU):</label>
                <SecureTextarea 
                    name="currentCondition" 
                    value={formData.currentCondition} 
                    onChange={handleChange} 
                    placeholder="Describe current critical condition." 
                    required 
                    className={styles.textArea}
                    maxLength={1000}
                />
                
                {/* 3. Use the new Button component */}
                <Button type="submit" variant="primary" disabled={loading}>
                    {loading ? 'Submitting...' : 'Register Account'}
                </Button>

                <p className={styles.loginPrompt}>Already have an account? <Link to="/login">Login here</Link>.</p>
            </form>
        </div>
    );
};
export default RegisterForm;