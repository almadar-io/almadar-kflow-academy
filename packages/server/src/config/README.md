# Config

This directory contains application configuration files and setup for external services.

## Purpose

- External service configurations (database, APIs, third-party services)
- Environment-specific configurations
- Connection setup and initialization
- Configuration helpers and utilities

## Examples

- `openai.js` - OpenAI client configuration ✅ (already implemented)
- `database.js` - Database connection setup (MongoDB, PostgreSQL, etc.)
- `redis.js` - Redis client configuration
- `email.js` - Email service configuration
- `auth.js` - Authentication service configuration (JWT secrets, OAuth keys)

## Best Practices

- Keep sensitive keys in environment variables (`.env`)
- Export factory functions or initialized clients
- Handle missing configurations gracefully
- Document required environment variables

## When to use

- When setting up external service clients
- When centralizing configuration logic
- When initializing connections that need to be reused across the application

