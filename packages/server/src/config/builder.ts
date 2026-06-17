/**
 * Builder service configuration.
 *
 * Used by Kflow server to call the apps/builder Rabit API.
 */

export const builderConfig = {
  baseUrl: process.env.BUILDER_API_URL || 'http://localhost:3004',
  apiPath: '/rabit/skill/generate-stream',
};
