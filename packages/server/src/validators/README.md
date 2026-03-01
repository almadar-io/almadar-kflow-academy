# Validators

This directory contains input validation logic, schemas, and validation middleware.

## Purpose

- Validate request body, query parameters, and route parameters
- Define validation schemas (using Joi, Yup, Zod, express-validator)
- Provide reusable validation rules
- Return clear error messages for invalid inputs

## Examples

- `noteValidator.js` - Validation schemas for note creation/updates
- `userValidator.js` - User registration/login validation
- `commonSchemas.js` - Reusable validation patterns (email, UUID, etc.)

## Using Validation Libraries

### Joi Example
```javascript
const Joi = require('joi');

const noteSchema = Joi.object({
  title: Joi.string().required().max(200),
  content: Joi.string().required(),
  tags: Joi.array().items(Joi.string()).optional()
});
```

### Zod Example
```javascript
const z = require('zod');

const noteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  tags: z.array(z.string()).optional()
});
```

## When to use

- When validating user input before processing
- When defining validation rules that can be reused
- When using validation libraries (Joi, Yup, Zod, express-validator)

