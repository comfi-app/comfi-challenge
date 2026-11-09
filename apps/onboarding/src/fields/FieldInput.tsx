import type { Field, FieldType, FieldValue } from "@comfi/kyb-contracts";
import { Checkbox, FormField, Input, Select } from "@comfi/ui";
import type { InputHTMLAttributes, ReactElement } from "react";
import { FileField } from "./FileField";
import { isFileRef, textOf } from "./values";

type TextLikeType = Exclude<FieldType, "select" | "checkbox" | "file">;

const textInputs: Record<TextLikeType, InputHTMLAttributes<HTMLInputElement>> = {
  text: { type: "text" },
  email: { type: "email", autoComplete: "email", inputMode: "email" },
  phone: { type: "tel", autoComplete: "tel", inputMode: "tel" },
  number: { type: "text", inputMode: "decimal" },
  date: { type: "date" },
};

interface FieldInputProps {
  field: Field;
  value: FieldValue | undefined;
  error: string | undefined;
  token: string;
  onChange: (value: FieldValue) => void;
}

export function FieldInput({ field, error, ...rest }: FieldInputProps) {
  // Checkboxes carry their own label next to the box.
  const label = field.type === "checkbox" ? undefined : field.label;
  return (
    <FormField label={label} required={field.required} hint={field.hint} error={error}>
      {(id) => <FieldControl id={id} field={field} invalid={Boolean(error)} {...rest} />}
    </FormField>
  );
}

interface FieldControlProps extends Omit<FieldInputProps, "error"> {
  id: string;
  invalid: boolean;
}

function FieldControl({ id, field, value, invalid, token, onChange }: FieldControlProps): ReactElement {
  const ariaInvalid = invalid || undefined;
  switch (field.type) {
    case "text":
    case "email":
    case "phone":
    case "number":
    case "date":
      return (
        <Input
          {...textInputs[field.type]}
          id={id}
          aria-invalid={ariaInvalid}
          placeholder={field.placeholder}
          value={textOf(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "select":
      return (
        <Select id={id} aria-invalid={ariaInvalid} value={textOf(value)} onChange={(event) => onChange(event.target.value)}>
          <option value="" disabled={field.required}>
            {field.placeholder ?? "Select…"}
          </option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );
    case "checkbox":
      return (
        <Checkbox
          id={id}
          aria-invalid={ariaInvalid}
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
          label={
            <>
              {field.label}
              {field.required && <span className="cf-label__req">*</span>}
            </>
          }
        />
      );
    case "file":
      return (
        <FileField
          id={id}
          field={field}
          invalid={invalid}
          token={token}
          value={isFileRef(value) ? value : null}
          onChange={onChange}
        />
      );
  }
}
