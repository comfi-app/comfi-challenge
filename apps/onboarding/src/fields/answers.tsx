import type { Field, FieldValue } from "@comfi/kyb-contracts";
import { formatBytes, formatDate } from "@comfi/ui";
import type { ReactNode } from "react";
import { api } from "../api";
import { isFileRef } from "./values";

const notProvided = <span className="ob-muted">Not provided</span>;

/** Read-only rendering of a submitted answer. */
export function formatAnswer(field: Field, value: FieldValue | undefined): ReactNode {
  if (value === undefined || value === null || value === "") return notProvided;
  switch (field.type) {
    case "checkbox":
      return value === true ? "Yes" : "No";
    case "file":
      return isFileRef(value) ? (
        <a href={api.fileUrl(value.fileId)} target="_blank" rel="noreferrer">
          {value.fileName} <span className="ob-muted">({formatBytes(value.size)})</span>
        </a>
      ) : (
        notProvided
      );
    case "select":
      return typeof value === "string"
        ? (field.options?.find((option) => option.value === value)?.label ?? value)
        : notProvided;
    case "date":
      return typeof value === "string" ? formatDate(`${value}T00:00:00`) : notProvided;
    case "text":
    case "email":
    case "phone":
    case "number":
      return typeof value === "string" ? value : notProvided;
  }
}
