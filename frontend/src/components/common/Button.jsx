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
const Button = ({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled = false,
  className = '',
  size = 'md',
  loading = false,
  ...rest
}) => {
  const sizeClass =
    size === 'small' || size === 'sm' ? styles.small : size === 'lg' || size === 'large' ? styles.large : '';
  const buttonClasses = `${styles.btn} ${styles[variant] || ''} ${sizeClass} ${className}`;
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={buttonClasses}
      data-loading={loading ? 'true' : undefined}
      aria-busy={loading ? true : undefined}
      {...rest}
    >
      <span className={styles.label}>{children}</span>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
    </button>
  );
};

export default Button;
