import { randomUUID } from 'crypto';

/**
 * Generates a UUID v4 for concepts
 * Uses Node's built-in crypto.randomUUID() for better randomness
 */
export function generateConceptId(): string {
  return randomUUID();
}

