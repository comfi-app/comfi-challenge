import type { Field } from "@comfi/kyb-contracts";
import { FormField, IconButton, Input, Select, Textarea } from "@comfi/ui";
import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Icon } from "../icons";
import type { Offset } from "../model/flow-reducer";

export function PanelHeader({ eyebrow, title, onDelete }: { eyebrow: string; title: string; onDelete?: () => void }) {
  return (
    <header className="fc-panel__header">
      <div className="fc-panel__heading">
        <span className="fc-panel__eyebrow">{eyebrow}</span>
        <h2 className="fc-panel__title">{title}</h2>
      </div>
      {onDelete && (
        <IconButton label={`Delete ${eyebrow.toLowerCase()}`} className="fc-danger-icon" onClick={onDelete}>
          <Icon name="trash" />
        </IconButton>
      )}
    </header>
  );
}

export function PanelSection({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="fc-panel__section">
      <div className="fc-panel__section-head">
        <h3 className="fc-panel__section-title">{title}</h3>
        {hint && <p className="fc-panel__section-hint">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  multiline?: boolean;
  placeholder?: string;
  hint?: ReactNode;
  /** Overrides the built-in "Required" message. */
  error?: string | null;
}

export function TextField({ label, value, onChange, required, multiline, placeholder, hint, error }: TextFieldProps) {
  const message = error ?? (required && !value.trim() ? "Required" : null);
  return (
    <FormField label={label} required={required} hint={hint} error={message}>
      {(id) =>
        multiline ? (
          <Textarea id={id} value={value} placeholder={placeholder} rows={3} aria-invalid={message !== null} onChange={(event) => onChange(event.target.value)} />
        ) : (
          <Input id={id} value={value} placeholder={placeholder} aria-invalid={message !== null} onChange={(event) => onChange(event.target.value)} />
        )
      }
    </FormField>
  );
}

interface ReorderControlsProps {
  /** Names the item for screen readers, e.g. `step "Contact details"`. */
  itemLabel: string;
  index: number;
  count: number;
  onMove: (offset: Offset) => void;
  onRemove: () => void;
}

export function ReorderControls({ itemLabel, index, count, onMove, onRemove }: ReorderControlsProps) {
  return (
    <div className="fc-reorder">
      <IconButton label={`Move ${itemLabel} up`} disabled={index === 0} onClick={() => onMove(-1)}>
        <Icon name="up" size={14} />
      </IconButton>
      <IconButton label={`Move ${itemLabel} down`} disabled={index === count - 1} onClick={() => onMove(1)}>
        <Icon name="down" size={14} />
      </IconButton>
      <IconButton label={`Delete ${itemLabel}`} className="fc-danger-icon" onClick={onRemove}>
        <Icon name="trash" size={14} />
      </IconButton>
    </div>
  );
}

interface AttributeInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Every field of the flow; their keys are offered as suggestions. */
  fields: readonly Field[];
  label: string;
}

/** Free-text attribute name with the flow's field keys as searchable suggestions. */
export function AttributeInput({ value, onChange, fields, label }: AttributeInputProps) {
  const listId = useId();
  return (
    <>
      <Input
        controlSize="sm"
        aria-label={label}
        list={listId}
        value={value}
        placeholder="company.legalForm"
        aria-invalid={!value.trim()}
        className="fc-mono-input"
        onChange={(event) => onChange(event.target.value)}
      />
      <datalist id={listId}>
        {fields.map((field) => (
          <option key={field.id} value={field.key}>
            {field.label}
          </option>
        ))}
      </datalist>
    </>
  );
}

/** List of free-text values entered as chips; Enter or comma adds the typed value. */
export function ValuesInput({ values, onChange, label }: { values: readonly string[]; onChange: (values: string[]) => void; label: string }) {
  const [text, setText] = useState("");

  const commit = () => {
    const value = text.trim();
    if (value && !values.includes(value)) onChange([...values, value]);
    setText("");
  };

  return (
    <div className="fc-chips">
      {values.map((value) => (
        <span key={value} className="fc-chip">
          {value}
          <button type="button" className="fc-chip__remove" aria-label={`Remove ${value}`} onClick={() => onChange(values.filter((item) => item !== value))}>
            <Icon name="close" size={12} />
          </button>
        </span>
      ))}
      <input
        className="fc-chips__input"
        aria-label={label}
        value={text}
        placeholder={values.length === 0 ? "Type a value, press Enter" : "Add value"}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commit();
          } else if (event.key === "Backspace" && !text && values.length > 0) {
            onChange(values.slice(0, -1));
          }
        }}
      />
    </div>
  );
}

export interface Choice<T extends string> {
  value: T;
  label: string;
}

interface ChoiceSelectProps<T extends string> extends Omit<ComponentProps<typeof Select>, "value" | "onChange"> {
  value: T;
  choices: readonly Choice<T>[];
  onChange: (value: T) => void;
}

/** Select over a fixed set of typed values. */
export function ChoiceSelect<T extends string>({ value, choices, onChange, ...rest }: ChoiceSelectProps<T>) {
  return (
    <Select
      {...rest}
      value={value}
      onChange={(event) => {
        const choice = choices.find((candidate) => candidate.value === event.target.value);
        if (choice) onChange(choice.value);
      }}
    >
      {choices.map((choice) => (
        <option key={choice.value} value={choice.value}>
          {choice.label}
        </option>
      ))}
    </Select>
  );
}
