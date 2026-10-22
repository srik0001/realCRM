/**
 * Realtime Database rejects `undefined`. For new records drop empty values entirely;
 * for updates turn them into `null` so the field is removed.
 */
export function compactForCreate<T extends object>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

export function compactForUpdate<T extends object>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === undefined || v === "" ? null : v;
  }
  return out;
}
