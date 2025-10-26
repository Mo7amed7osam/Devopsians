// src/components/Button.jsx
import React from 'react';
import styles from './Button.module.css';

/**
 * A reusable button component with different visual styles.
 * @param {object} props
 * @param {React.ReactNode} props.children - The content inside the button (text, icon, etc.).
 * @param {() => void} props.onClick - The function to call when the button is clicked.
 * @param {'primary' | 'success' | 'danger' | 'secondary'} [props.variant='primary'] - The button's style.
 * @param {'submit' | 'button'} [props.type='button'] - The button's HTML type.
 * @param {boolean} [props.disabled=false] - Whether the button is disabled.
 * @param {string} [props.className] - Additional classes to apply.
 */
const Button = ({ children, onClick, variant = 'primary', type = 'button', disabled = false, className = '' }) => {
  // Combine the base button style, the variant style, and any extra classes
  const buttonClasses = `${styles.btn} ${styles[variant]} ${className}`;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={buttonClasses}
    >
      {children}
    </button>
  );
};

export default Button;