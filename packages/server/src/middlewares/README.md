# Middlewares

This directory contains custom Express middleware functions that process requests before they reach route handlers.

## Purpose

- Authentication and authorization
- Request validation and sanitization
- Logging and monitoring
- Error handling
- Rate limiting
- Request/response transformation
- Custom business logic that applies to multiple routes

## Examples

- `auth.js` - Authentication middleware (JWT verification, session validation)
- `validateRequest.js` - Input validation middleware
- `errorHandler.js` - Centralized error handling
- `logger.js` - Request logging middleware
- `rateLimiter.js` - Rate limiting middleware

## Usage Pattern

```javascript
// In app.js or routes
const auth = require('./middlewares/auth');
const validateRequest = require('./middlewares/validateRequest');

router.post('/protected', auth, validateRequest, controller.handler);
```

## When to use

- When logic needs to run before multiple routes
- When implementing cross-cutting concerns (auth, logging, validation)
- When transforming requests/responses globally

