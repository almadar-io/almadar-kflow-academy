# Services

This directory contains isolated business logic that doesn't belong in controllers or models.

## Purpose

- External API integrations (email services, payment gateways, etc.)
- Complex business logic that multiple controllers might use
- Third-party service wrappers
- Data processing and transformation
- Background task execution helpers

## Examples

- `emailService.js` - SendGrid, Nodemailer email sending
- `aiService.js` - OpenAI, Anthropic API wrappers (if more complex than basic client config)
- `notificationService.js` - Push notifications, SMS
- `storageService.js` - File upload to S3, Cloudinary
- `analyticsService.js` - Tracking and analytics

## Key Principles

- Services should be **stateless** and **reusable**
- Services contain **business logic**, not route handling
- Services can be used by multiple controllers
- Services should be **testable** independently

## When to use

- When integrating with external APIs or services
- When logic is complex and used by multiple controllers
- When separating concerns from controllers for better testability

