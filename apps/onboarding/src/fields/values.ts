import type { Field, FieldValue, FileRef, StepValues } from "@comfi/kyb-contracts";

export const isFileRef = (value: FieldValue | undefined): value is FileRef =>
  typeof value === "object" && value !== null;

export const textOf = (value: FieldValue | undefined) => (typeof value === "string" ? value : "");

function emptyValue(field: Field): FieldValue {
  switch (field.type) {
    case "checkbox":
      return false;
    case "file":
      return null;
    case "text":
    case "email":
    case "phone":
    case "date":
    case "number":
    case "select":
      return "";
  }
}

/** Form state for a step: previously submitted answers, empty values for the rest. */
export const initialValues = (fields: readonly Field[], submitted: StepValues): StepValues =>
  Object.fromEntries(fields.map((field) => [field.key, submitted[field.key] ?? emptyValue(field)]));

const extensions: Record<string, string> = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPG",
};

/** "PDF, PNG or JPG" */
export function acceptLabel(accept: readonly string[]) {
  const labels = accept.map((type) => extensions[type] ?? type.split("/").at(-1)?.toUpperCase() ?? type);
  return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} or ${labels.at(-1)}` : (labels[0] ?? "");
}
