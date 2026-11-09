export type IdPrefix = "stage" | "step" | "field" | "tr" | "ending";

/** Readable, practically unique id such as `stage-x7k2p9`. */
export function newId(prefix: IdPrefix): string {
  const suffix = Math.random().toString(36).slice(2, 8).padEnd(6, "0");
  return `${prefix}-${suffix}`;
}
