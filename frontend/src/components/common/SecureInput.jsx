import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { sanitizeInput, isValidEmail, isValidPhone } from '../../utils/security';

/**
 * SecureInput - A wrapper component for text inputs with built-in sanitization and validation
 * Automatically sanitizes input on change and validates based on type
 */
const SecureInput = ({ 
  type = 'text', 
  name, 
  value, 
  onChange, 
  maxLength,
  pattern,
  required = false,
  disabled = false,
  placeholder = '',
  className = '',
  id,
  autoComplete,
  min,
  max,
  step,
  validateEmail = false,
  validatePhone = false,
  ...rest 
}) => {
  
  /**
   * Handle input change with automatic sanitization
   */
  const handleSecureChange = useCallback((e) => {
    const { name: fieldName, value: fieldValue, type: inputType } = e.target;
    
    // For number inputs, allow numeric validation to work
    if (inputType === 'number') {
      onChange(e);
      return;
    }
    
    // Sanitize text inputs
    let sanitizedValue = fieldValue;
    
    if (inputType === 'text' || inputType === 'email' || inputType === 'tel' || inputType === 'url') {
      sanitizedValue = sanitizeInput(fieldValue);
      
      // Additional validation for email
      if (validateEmail && sanitizedValue) {
        const emailValid = isValidEmail(sanitizedValue);
        e.target.setCustomValidity(emailValid ? '' : 'Please enter a valid email address');
      }
      
      // Additional validation for phone
      if (validatePhone && sanitizedValue) {
        const phoneValid = isValidPhone(sanitizedValue);
        e.target.setCustomValidity(phoneValid ? '' : 'Please enter a valid phone number (e.g., 01001234567)');
      }
    }
    
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
  }, [onChange, validateEmail, validatePhone]);
  
  // Set appropriate max lengths based on type
  const getMaxLength = () => {
    if (maxLength) return maxLength;
    
    switch (type) {
      case 'email': return 254; // RFC 5321
      case 'tel': return 20;
      case 'password': return 128;
      case 'url': return 2048;
      default: return 500; // Reasonable default for text inputs
    }
  };
  
  // Set patterns based on type if not provided
  const getPattern = () => {
    if (pattern) return pattern;
    
    if (validateEmail) {
      return "[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}";
    }
    
    if (validatePhone) {
      return "01[0-9]{9}"; // Egyptian phone format
    }
    
    return undefined;
  };
  
  return (
    <input
      type={type}
      name={name}
      id={id || name}
      value={value || ''}
      onChange={handleSecureChange}
      maxLength={getMaxLength()}
      pattern={getPattern()}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      autoComplete={autoComplete}
      min={min}
      max={max}
      step={step}
      {...rest}
    />
  );
};

SecureInput.propTypes = {
  type: PropTypes.oneOf(['text', 'email', 'password', 'tel', 'url', 'number', 'date', 'datetime-local', 'time']),
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  maxLength: PropTypes.number,
  pattern: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  id: PropTypes.string,
  autoComplete: PropTypes.string,
  min: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  max: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  step: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  validateEmail: PropTypes.bool,
  validatePhone: PropTypes.bool,
};

export default SecureInput;
