/**
 * Pure helper for build-site.mjs: find the organism in the installed behavior registry.
 * A copy of almadar/orb/scripts/site-lib.mjs — keep the two in step.
 */
import path from 'node:path';

/** The registry-relative path of `<organism>.orb` under an `organisms/` folder, or undefined. */
export function findOrganism(registryFiles, organism) {
  return registryFiles.find((p) => path.basename(p) === `${organism}.orb` && p.split(/[\\/]/).includes('organisms'));
}
