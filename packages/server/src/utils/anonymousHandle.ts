import { createHash } from 'node:crypto';

/** Deterministic, non-reversible short handle for a user. Stable across nodes. */
export function anonymousHandleFor(uid: string): string {
  return 'peer-' + createHash('sha1').update(uid).digest('hex').slice(0, 6);
}
