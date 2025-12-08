# Security Implementation Guide

## Overview
This document outlines the comprehensive security measures implemented to protect against XSS, DoS, NoSQL injection, and other common web vulnerabilities.

## Backend Security Measures

### 1. HTTP Security Headers (Helmet)
- **Content-Security-Policy**: Restricts resource loading to prevent XSS
- **X-Frame-Options**: Prevents clickjacking attacks (DENY)
- **X-Content-Type-Options**: Prevents MIME-type sniffing (nosniff)
- **X-XSS-Protection**: Enables browser XSS filters

### 2. Rate Limiting (express-rate-limit)
- **General API**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 5 attempts per 15 minutes per IP
- Prevents DoS and brute-force attacks
- Applied to `/user/login`, `/user/register`, `/admin/login`

### 3. NoSQL Injection Prevention
- **express-mongo-sanitize**: Strips `$` and `.` from user input
- **Custom sanitization**: Validates MongoDB operators
- **Query sanitization**: Only allows safe operators (`$eq`, `$ne`, `$gt`, etc.)

### 4. HTTP Parameter Pollution (HPP)
- **hpp middleware**: Prevents parameter pollution attacks
- Protects against duplicate parameters in query strings

### 5. Request Size Limits
- **Body size**: Limited to 10KB to prevent DoS
- **File uploads**: Limited to 5MB
- **Timeout**: 10 seconds for API requests

### 6. Input Sanitization (Custom Middleware)
- **XSS Prevention**: HTML special characters are escaped
- **Prototype pollution**: Blocks `__proto__`, `constructor`, `prototype`
- **SQL Injection detection**: Monitors for SQL patterns
- Applied to all request bodies, queries, and parameters

## Frontend Security Measures

### 1. XSS Prevention
- **Input sanitization**: Removes script tags and event handlers
- **HTML escaping**: Encodes special characters
- **URL validation**: Blocks `javascript:` and `data:` protocols
- **Safe navigation**: Validates URLs before routing

### 2. Client-Side Rate Limiting
- Tracks request frequency per endpoint
- Default: 50 requests per minute
- Prevents client-side DoS

### 3. Secure Form Handling
- **Form data sanitization**: All inputs sanitized before submission
- **NoSQL injection detection**: Monitors for MongoDB operators
- **Validation**: Email and phone format validation

### 4. Safe Link Handling
- URL validation before navigation
- Prevents open redirect vulnerabilities
- Blocks dangerous protocols

## Security Utilities

### Backend (`/backend/utils/sanitize.js`)
```javascript
- sanitizeString(): Escapes HTML special characters
- sanitizeObject(): Recursively sanitizes objects
- sanitizeMongoQuery(): Validates MongoDB queries
- sanitizeUrl(): Validates and cleans URLs
- sanitizeRequest(): Middleware for request sanitization
```

### Frontend (`/frontend/src/utils/security.js`)
```javascript
- escapeHtml(): Escapes HTML entities
- sanitizeInput(): Removes dangerous content
- sanitizeUrl(): Validates URLs
- safeNavigate(): Secure navigation helper
- secureFormSubmit(): Sanitizes form data
- RateLimiter: Client-side rate limiting
```

## Implementation Examples

### Backend Route Protection
```javascript
import { sanitizeRequest } from './utils/sanitize.js';

// Apply to specific routes
app.use('/api/sensitive', sanitizeRequest);

// Already applied globally in index.js
```

### Frontend Form Submission
```javascript
import { secureFormSubmit } from './utils/security';

const handleSubmit = async (formData) => {
  // Sanitize before sending
  const sanitizedData = secureFormSubmit(formData);
  await api.post('/endpoint', sanitizedData);
};
```

### Safe URL Navigation
```javascript
import { safeNavigate } from './utils/security';

// Instead of navigate(url)
safeNavigate(navigate, userProvidedUrl);
```

## Testing Security

### XSS Test Payloads
Try these in input fields (should be blocked):
```
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
javascript:alert('XSS')
<iframe src="javascript:alert('XSS')">
```

### NoSQL Injection Test
Try these in login fields (should be sanitized):
```
{ $ne: null }
{ $gt: '' }
admin' || '1'=='1
{ $where: 'this.password' }
```

### DoS Test
- Make 100+ requests in 15 minutes → Should be rate-limited
- Send large payload (>10KB) → Should be rejected
- Upload file >5MB → Should be rejected

## Configuration

### Environment Variables
```bash
# Backend (.env)
NODE_ENV=production
CORS_ALLOW_ALL=false  # Never true in production
FRONTEND_URL=https://your-domain.com
```

### Rate Limit Customization
Edit `backend/index.js`:
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // Time window
  max: 100,                   // Max requests
  message: "Custom message",
});
```

## Security Checklist

- [x] Helmet security headers enabled
- [x] Rate limiting on all endpoints
- [x] Authentication rate limiting (5 attempts)
- [x] NoSQL injection prevention
- [x] XSS input sanitization
- [x] HTTP parameter pollution protection
- [x] Request size limits (10KB body, 5MB files)
- [x] URL validation and safe navigation
- [x] Prototype pollution protection
- [x] Client-side rate limiting
- [x] CORS properly configured
- [x] JWT token validation
- [x] Secure cookie handling
- [x] HTTPS enforcement (production)

## Additional Recommendations

1. **HTTPS**: Always use HTTPS in production
2. **Environment Variables**: Never commit secrets to Git
3. **Regular Updates**: Keep dependencies updated (`npm audit fix`)
4. **Logging**: Monitor for suspicious activity
5. **Backup**: Regular database backups
6. **Testing**: Regular security testing and penetration testing
7. **CSP**: Configure Content Security Policy based on your needs
8. **Session Management**: Use secure, HTTP-only cookies

## Monitoring

Watch for these in logs:
- `Sanitized key detected`: NoSQL injection attempt
- `Blocked dangerous MongoDB operator`: Query manipulation attempt
- `Too many requests`: DoS attempt
- `401 Unauthorized`: Invalid authentication attempts

## Support

For security concerns or to report vulnerabilities, contact your security team.

Last Updated: December 8, 2025
