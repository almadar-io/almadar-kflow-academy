# Jobs / Tasks

This directory contains background jobs, scheduled tasks, and cron jobs.

## Purpose

- Scheduled tasks (cron jobs)
- Background job processing
- Recurring maintenance tasks
- Asynchronous task queues
- Data cleanup and archival

## Examples

- `cleanupJobs.js` - Clean up old data, expired sessions
- `syncJobs.js` - Sync data with external services
- `reportJobs.js` - Generate and send periodic reports
- `backupJobs.js` - Database backups
- `notificationJobs.js` - Scheduled notifications

## Job Runners

Popular libraries for handling jobs:
- **node-cron** - Simple cron scheduling
- **agenda** - MongoDB-backed job scheduler
- **bull** - Redis-based queue system
- **node-schedule** - Flexible job scheduling

## Example Structure

```javascript
// jobs/dailyCleanup.js
const cron = require('node-cron');

cron.schedule('0 0 * * *', () => {
  // Run daily at midnight
  cleanupOldData();
});
```

## When to use

- When you need to run tasks on a schedule
- When processing time-consuming operations in the background
- When implementing task queues for async processing

