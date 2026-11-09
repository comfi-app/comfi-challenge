import type { FieldValue } from "@comfi/kyb-contracts";

export interface AttributeGroup {
  key: string;
  title: string;
  attributes: { key: string; label: string; value: FieldValue }[];
}

/** "dateOfBirth" → "Date of birth", "trade_licence" → "Trade licence". */
export function humanize(key: string) {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._]+/g, " ")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Short prefixes such as "kyb" are acronyms.
const groupTitle = (prefix: string) => (prefix.length <= 3 ? prefix.toUpperCase() : humanize(prefix));

/** Groups attributes by the key prefix before the first dot, both sorted by key. */
export function groupAttributes(attributes: Record<string, FieldValue>): AttributeGroup[] {
  const groups = new Map<string, AttributeGroup>();
  const entries = Object.entries(attributes).toSorted(([a], [b]) => a.localeCompare(b));
  for (const [key, value] of entries) {
    const dot = key.indexOf(".");
    const prefix = dot > 0 ? key.slice(0, dot) : "";
    let group = groups.get(prefix);
    if (!group) {
      group = { key: prefix, title: prefix ? groupTitle(prefix) : "General", attributes: [] };
      groups.set(prefix, group);
    }
    group.attributes.push({ key, label: humanize(key.slice(dot + 1)), value });
  }
  return [...groups.values()].toSorted((a, b) => a.key.localeCompare(b.key));
}
