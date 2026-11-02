/**
 * Pure helpers for the app scripts: the organism's source path from `orb behaviors which`, and the orb binary
 * package for this platform from the packages' declared `os` and `cpu`.
 */

/** The path `orb behaviors which` printed before its ` (@package@version)` suffix; throws on any other line. */
export function locatedSource(line) {
  const match = /^(.+) \(@[^)]+\)$/.exec(line.trim());
  if (match === null) throw new Error(`not a located behavior: ${line.trim()}`);
  return match[1];
}

/** The one candidate whose declared `os` and `cpu` hold this platform and arch; throws on none or several. */
export function platformPackage(candidates, platform, arch) {
  const matches = candidates.filter((c) => c.os.includes(platform) && c.cpu.includes(arch));
  if (matches.length === 0) throw new Error(`no orb binary package declares ${platform}-${arch}`);
  if (matches.length > 1) throw new Error(`${matches.length} orb binary packages declare ${platform}-${arch}`);
  return matches[0].name;
}
