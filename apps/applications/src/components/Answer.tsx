import type { Field, FieldValue } from "@comfi/kyb-contracts";
import { FileLink, useAdminApp } from "@comfi/ui";
import { formatCalendarDate } from "../format";

/** A submitted answer rendered for its field type. */
export function Answer({ field, value }: { field: Field; value: FieldValue | undefined }) {
  const { api } = useAdminApp();

  if (value === undefined || value === null || value === "") return <span className="cf-muted">—</span>;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return <FileLink file={value} href={api.fileUrl(value.fileId)} />;

  switch (field.type) {
    case "select":
      return field.options?.find((option) => option.value === value)?.label ?? value;
    case "date":
      return formatCalendarDate(value);
    case "email":
      return <a href={`mailto:${value}`}>{value}</a>;
    default:
      return value;
  }
}
