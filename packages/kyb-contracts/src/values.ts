import { z } from "zod";

export const FileRef = z.object({
  fileId: z.string().uuid(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
});
export type FileRef = z.infer<typeof FileRef>;

export const FieldValue = z.union([z.string(), z.boolean(), FileRef, z.null()]);
export type FieldValue = z.infer<typeof FieldValue>;

/** Answers of one step, keyed by field key. */
export const StepValues = z.record(z.string(), FieldValue);
export type StepValues = z.infer<typeof StepValues>;

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
