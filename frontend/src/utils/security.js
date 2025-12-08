// Frontend security utilities to prevent XSS attacks

/**
 * Escape HTML special characters to prevent XSS
 */
export const escapeHtml = (text) => {
  if (typeof text !== 'string') return text;
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
};

/**
 * Sanitize user input to remove potentially dangerous content
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove script tags
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  
  return sanitized;
};

/**
 * Validate and sanitize URL to prevent open redirects
 */
export const sanitizeUrl = (url) => {
  if (typeof url !== 'string') return '';
  
  url = url.trim();
  
  // Block javascript: protocol
  if (url.toLowerCase().startsWith('javascript:')) {
    console.warn('Blocked javascript: URL');
    return '';
  }
  
  // Block data: URLs that could contain scripts
  if (url.toLowerCase().startsWith('data:')) {
    console.warn('Blocked data: URL');
    return '';
  }
  
  // Only allow http, https, and relative URLs
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return url;
  }
  
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url;
    }
    console.warn(`Blocked unsafe protocol: ${parsed.protocol}`);
    return '';
  } catch (e) {
    // Relative URL or invalid URL
    if (url.startsWith('/')) {
      return url;
    }
    console.warn('Invalid URL blocked');
    return '';
  }
};

/**
 * Safely navigate to a URL after validation
 */
export const safeNavigate = (navigate, url, options = {}) => {
  const sanitized = sanitizeUrl(url);
  if (sanitized) {
    navigate(sanitized, options);
  } else {
    console.error('Navigation blocked: Invalid URL');
  }
};

/**
 * Create a safe link component that validates URLs
 */
export const createSafeLink = (href) => {
  const sanitized = sanitizeUrl(href);
  return sanitized || '#';
};

/**
 * Prevent XSS in dynamic content rendering
 * Use this when rendering user-generated content
 */
export const renderSafeHtml = (html) => {
  if (typeof html !== 'string') return '';
  
  // Create a temporary div
  const temp = document.createElement('div');
  temp.textContent = html; // This automatically escapes HTML
  return temp.innerHTML;
};

/**
 * Validate email format (client-side)
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate that input doesn't contain NoSQL injection patterns
 */
export const hasNoSQLInjection = (input) => {
  if (typeof input !== 'string') return false;
  
  const dangerousPatterns = [
    /\$where/i,
    /\$ne/i,
    /\$gt/i,
    /\$regex/i,
    /\{\s*\$/,
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(input));
};

/**
 * Rate limiting helper for frontend (track request counts)
 */
class RateLimiter {
  constructor(maxRequests = 10, timeWindow = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = new Map();
  }

  canMakeRequest(key) {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    
    // Remove old requests outside the time window
    const recentRequests = userRequests.filter(time => now - time < this.timeWindow);
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    return true;
  }

  reset(key) {
    this.requests.delete(key);
  }
}

export const apiRateLimiter = new RateLimiter(50, 60000); // 50 requests per minute

/**
 * Secure form submission helper
 */
export const secureFormSubmit = (formData) => {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(formData)) {
    if (typeof value === 'string') {
      // Check for injection attempts
      if (hasNoSQLInjection(value)) {
        console.warn(`Potential NoSQL injection detected in field: ${key}`);
        continue;
      }
      sanitized[key] = sanitizeInput(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};
