/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@almadar/sdk$': '<rootDir>/node_modules/@almadar/sdk/dist/index.js',
    '^@almadar/sdk/client$': '<rootDir>/node_modules/@almadar/sdk/dist/client/index.js',
    '^@almadar/server$': '<rootDir>/../../node_modules/@almadar/server/dist/index.js',
    '^@almadar-io/knowledge$': '<rootDir>/../../node_modules/@almadar-io/knowledge/dist/index.js',
    '^@almadar-io/knowledge/server$': '<rootDir>/../../node_modules/@almadar-io/knowledge/dist/server.js',
    '^@kflow-academy/shared$': '<rootDir>/node_modules/@kflow-academy/shared/dist/index.js',
    '^@almadar/llm$': '<rootDir>/node_modules/@almadar/llm/dist/index.js',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
    '^.+\\.jsx?$': ['ts-jest', { useESM: true, tsconfig: { allowJs: true } }],
    // Transform ESM .js from allowed @almadar packages so Jest can load them as CJS.
    '^.+\\.js$': ['ts-jest', { useESM: false, tsconfig: { allowJs: true, isolatedModules: true } }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@almadar|@almadar-io|@kflow-academy)[\\/])',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '\\.helper\\.ts$',
    '<rootDir>/src/__tests__/setup\\.ts$',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
};
