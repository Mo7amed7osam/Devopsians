import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { sanitizeInput } from '../../utils/security';

/**
 * SecureSelect - A wrapper component for select dropdowns with built-in sanitization
 * Validates that selected value matches allowed options
 */
const SecureSelect = ({ 
  name, 
  value, 
  onChange, 
  options = [],
  required = false,
  disabled = false,
  className = '',
  id,
  children,
  ...rest 
}) => {
  
  /**
   * Handle select change with validation
   */
  const handleSecureChange = useCallback((e) => {
    const { name: fieldName, value: fieldValue } = e.target;
    
    // Sanitize selected value
    const sanitizedValue = sanitizeInput(fieldValue);
    
    // Validate that the selected value is in the allowed options
    if (options.length > 0) {
      const validOptions = options.map(opt => 
        typeof opt === 'string' ? opt : opt.value
      );
      
      if (sanitizedValue && !validOptions.includes(sanitizedValue)) {
        console.warn(`Invalid option selected: ${sanitizedValue}`);
        return; // Don't update if invalid option
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
  }, [onChange, options]);
  
  return (
    <select
      name={name}
      id={id || name}
      value={value || ''}
      onChange={handleSecureChange}
      required={required}
      disabled={disabled}
      className={className}
      {...rest}
    >
      {children || (
        <>
          <option value="">Select an option</option>
          {options.map((option, index) => {
            const optionValue = typeof option === 'string' ? option : option.value;
            const optionLabel = typeof option === 'string' ? option : option.label;
            
            return (
              <option key={`${optionValue}-${index}`} value={optionValue}>
                {optionLabel}
              </option>
            );
          })}
        </>
      )}
    </select>
  );
};

SecureSelect.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        label: PropTypes.string.isRequired,
      }),
    ])
  ),
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  id: PropTypes.string,
  children: PropTypes.node,
};

export default SecureSelect;
