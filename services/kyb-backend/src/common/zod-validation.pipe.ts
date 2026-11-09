import type { ArgumentMetadata, PipeTransform } from "@nestjs/common";
import type { z } from "zod";
import { ApiException } from "./api-exception";

export class ZodValidationPipe<Schema extends z.ZodType> implements PipeTransform<unknown, z.output<Schema>> {
  constructor(private readonly schema: Schema) {}

  transform(value: unknown, metadata: ArgumentMetadata): z.output<Schema> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      // Issues on the whole value are keyed by the parameter name, e.g. `status` for `@Query("status")`.
      const path = issue.path.map(String).join(".") || metadata.data || metadata.type;
      fieldErrors[path] ??= issue.message;
    }
    throw ApiException.fieldErrors("Invalid request", fieldErrors);
  }
}
