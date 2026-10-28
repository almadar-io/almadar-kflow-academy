/**
 * Pure helper for build-site.mjs: read the organism's source path from `orb behaviors which`.
 */

/** The path `orb behaviors which` printed before its ` (@package@version)` suffix; throws on any other line. */
export function locatedSource(line) {
  const match = /^(.+) \(@[^)]+\)$/.exec(line.trim());
  if (match === null) throw new Error(`not a located behavior: ${line.trim()}`);
  return match[1];
}
