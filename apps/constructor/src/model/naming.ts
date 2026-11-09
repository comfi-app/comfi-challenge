const words = (text: string) => text.match(/[a-zA-Z0-9]+/g) ?? [];

/** "Company details" → "companyDetails". Always starts with a letter, or is empty. */
export function camelCase(text: string): string {
  const joined = words(text)
    .map((word, index) => (index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join("");
  return joined.replace(/^[0-9]+/, "");
}

/** "Business onboarding (UAE)" → "business-onboarding-uae". */
export function slugify(text: string): string {
  return words(text).join("-").toLowerCase().replace(/^[0-9-]+/, "");
}

/** Attribute key proposed for a field, e.g. `companyDetails.legalName`. */
export function suggestFieldKey(stepName: string, label: string): string {
  return `${camelCase(stepName) || "step"}.${camelCase(label) || "field"}`;
}
