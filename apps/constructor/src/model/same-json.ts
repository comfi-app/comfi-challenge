type Json = string | number | boolean | null | undefined | Json[] | { [key: string]: Json };

const isRecord = (value: Json): value is { [key: string]: Json } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Structural equality of JSON data; ignores key order and keys set to `undefined`. */
export function sameJson(a: Json, b: Json): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, index) => sameJson(item, b[index]));
  }
  if (isRecord(a) && isRecord(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every((key) => sameJson(a[key], b[key]));
  }
  return a === b;
}
