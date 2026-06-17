export function singleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function singleQueryParam(
  value: string | import('qs').ParsedQs | (string | import('qs').ParsedQs)[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' ? first : undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}
