import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { sanitizeInput } from '../../utils/security';

/**
 * SecureTextarea - A wrapper component for textarea with built-in sanitization
 * Automatically sanitizes input on change to prevent XSS
 */
const SecureTextarea = ({ 
  name, 
  value, 
  onChange, 
  maxLength = 5000,
  rows = 4,
  cols,
  required = false,
  disabled = false,
  placeholder = '',
  className = '',
  id,
  ...rest 
}) => {
  
  /**
   * Handle textarea change with automatic sanitization
   */
  const handleSecureChange = useCallback((e) => {
    const { name: fieldName, value: fieldValue } = e.target;
    
    // Sanitize textarea content
    const sanitizedValue = sanitizeInput(fieldValue);
    
    // Create a new synthetic event with sanitized value
    const sanitizedEvent = {
      ...e,
      target: {
        ...e.target,
        name: fieldName,
        value: sanitizedValue,
      },
    };
    
    onChange(sanitizedEvent);
  }, [onChange]);
  
  return (
    <textarea
      name={name}
      id={id || name}
      value={value || ''}
      onChange={handleSecureChange}
      maxLength={maxLength}
      rows={rows}
      cols={cols}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      {...rest}
    />
  );
};

SecureTextarea.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  maxLength: PropTypes.number,
  rows: PropTypes.number,
  cols: PropTypes.number,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  id: PropTypes.string,
};

export default SecureTextarea;
