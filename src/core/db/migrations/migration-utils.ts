const versionRegexp = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;

export function between(to: number, l: number, g: number) {
  return to >= l && to <= g;
}

export function getVersionCode(version: string): number {
  const versionMatch = version.match(versionRegexp);
  if (!versionMatch) {
    return -1;
  }
  const major = parseInt(versionMatch[1]);
  const minor = parseInt(versionMatch[2]);
  const fix = parseInt(versionMatch[3]);
  return fix + minor * 100 + major * 10000;
}
