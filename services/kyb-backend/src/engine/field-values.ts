import type { Field, FieldValue, FileRef, StepValues } from "@comfi/kyb-contracts";

export type StepValuesResult =
  | { ok: true; values: StepValues }
  | { ok: false; fieldErrors: Record<string, string> };

type Checked = { value: FieldValue } | { error: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const numberPattern = /^-?\d+(\.\d+)?$/;
const phonePattern = /^\+?[\d\s()-]{7,20}$/;

function isCalendarDate(value: string): boolean {
  if (!datePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function checkValue(field: Field, value: string | boolean | FileRef, files: ReadonlyMap<string, FileRef>): Checked {
  if (field.type === "checkbox") {
    if (typeof value !== "boolean") return { error: "Expected true or false" };
    if (field.required && !value) return { error: "Please confirm to continue" };
    return { value };
  }

  if (field.type === "file") {
    if (typeof value !== "object") return { error: "Upload a file" };
    const stored = files.get(value.fileId);
    if (!stored) return { error: "File not found" };
    if (field.accept?.length && !field.accept.includes(stored.mimeType)) {
      return { error: "This file type is not accepted" };
    }
    return { value: stored };
  }

  if (typeof value !== "string") return { error: "Expected text" };
  const text = value.trim();
  switch (field.type) {
    case "email":
      return emailPattern.test(text) ? { value: text } : { error: "Enter a valid email address" };
    case "phone":
      return phonePattern.test(text) ? { value: text } : { error: "Enter a valid phone number" };
    case "date":
      return isCalendarDate(text) ? { value: text } : { error: "Enter a date as YYYY-MM-DD" };
    case "number":
      return numberPattern.test(text) ? { value: text } : { error: "Enter a number" };
    case "select":
      return field.options?.some((option) => option.value === text)
        ? { value: text }
        : { error: "Choose one of the options" };
    case "text":
      return { value: text };
  }
}

/**
 * Validates the answers of one step against its fields. `files` holds the files the
 * applicant may reference; file answers are replaced with the stored file metadata.
 */
export function validateStepValues(
  fields: readonly Field[],
  input: StepValues,
  files: ReadonlyMap<string, FileRef>,
): StepValuesResult {
  const values: StepValues = {};
  const fieldErrors: Record<string, string> = {};
  const known = new Set(fields.map((field) => field.key));

  for (const key of Object.keys(input)) {
    if (!known.has(key)) fieldErrors[key] = "Unknown field";
  }

  for (const field of fields) {
    const value = input[field.key];
    if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
      if (!field.required) values[field.key] = null;
      else fieldErrors[field.key] = field.type === "checkbox" ? "Please confirm to continue" : "This field is required";
      continue;
    }
    const checked = checkValue(field, value, files);
    if ("error" in checked) fieldErrors[field.key] = checked.error;
    else values[field.key] = checked.value;
  }

  return Object.keys(fieldErrors).length > 0 ? { ok: false, fieldErrors } : { ok: true, values };
}
