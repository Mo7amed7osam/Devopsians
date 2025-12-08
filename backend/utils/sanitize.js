// Sanitization and validation utilities to prevent XSS and injection attacks

/**
 * Sanitize string input to prevent XSS attacks
 * Removes or encodes potentially dangerous characters
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  // Remove null bytes
  str = str.replace(/\0/g, '');
  
  // Encode HTML special characters
  const htmlEscapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return str.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char);
};

/**
 * Sanitize object recursively
 * Removes dangerous properties and sanitizes string values
 */
export const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip prototype pollution attempts
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }

    // Sanitize the key
    const cleanKey = sanitizeString(key);
    
    // Recursively sanitize the value
    if (typeof value === 'object' && value !== null) {
      sanitized[cleanKey] = sanitizeObject(value);
    } else if (typeof value === 'string') {
      sanitized[cleanKey] = sanitizeString(value);
    } else {
      sanitized[cleanKey] = value;
    }
  }

  return sanitized;
};

/**
 * Validate and sanitize MongoDB query operators
 * Prevents NoSQL injection through operator injection
 */
export const sanitizeMongoQuery = (query) => {
  if (typeof query !== 'object' || query === null) {
    return query;
  }

  const sanitized = {};
  const allowedOperators = ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$and', '$or', '$not', '$exists'];

  for (const [key, value] of Object.entries(query)) {
    // Block dangerous operators
    if (key.startsWith('$') && !allowedOperators.includes(key)) {
      console.warn(`Blocked dangerous MongoDB operator: ${key}`);
      continue;
    }

    // Recursively sanitize nested queries
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMongoQuery(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Sanitize URL to prevent open redirect vulnerabilities
 */
export const sanitizeUrl = (url) => {
  if (typeof url !== 'string') return '';
  
  // Remove any whitespace
  url = url.trim();
  
  // Check for javascript: protocol
  if (url.toLowerCase().startsWith('javascript:')) {
    return '';
  }
  
  // Check for data: protocol (can be used for XSS)
  if (url.toLowerCase().startsWith('data:')) {
    return '';
  }
  
  // Only allow http, https, and relative URLs
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return url;
  }
  
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      return url;
    }
  } catch (e) {
    // Invalid URL
    return '';
  }
  
  return '';
};

/**
 * Middleware to sanitize request body, query, and params
 */
export const sanitizeRequest = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (basic validation)
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^[0-9+\-\s()]{10,20}$/;
  return phoneRegex.test(phone);
};

/**
 * Check for SQL injection patterns (defense in depth)
 */
export const hasSQLInjection = (str) => {
  if (typeof str !== 'string') return false;
  
  const sqlPatterns = [
    /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i,
    /UNION\s+SELECT/i,
    /DROP\s+TABLE/i,
    /INSERT\s+INTO/i,
    /DELETE\s+FROM/i,
    /UPDATE\s+\w+\s+SET/i,
    /--/,
    /;.*--/,
    /'\s*OR\s*'1'\s*=\s*'1/i,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(str));
};
