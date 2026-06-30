// @ts-nocheck
/**
 * Firebase Admin re-exports used by tests/mocks.
 *
 * Runtime auth is handled by `@almadar/server`; this module exists so
 * legacy tests that mock `../../config/firebaseAdmin` can resolve the path.
 */
export { getFirestore, getFirebaseAuth, getFirebaseAdmin } from '@almadar/server';
