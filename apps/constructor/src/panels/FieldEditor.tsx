import { Field, fieldTypes, type FieldOption, type FieldType } from "@comfi/kyb-contracts";
import { Button, Checkbox, FormField, IconButton, Input } from "@comfi/ui";
import { Icon } from "../icons";
import { documentMimeTypes } from "../model/factories";
import type { FieldPatch } from "../model/flow-reducer";
import { ChoiceSelect, TextField, type Choice } from "./controls";

export const fieldTypeLabels: Record<FieldType, string> = {
  text: "Text",
  email: "Email",
  phone: "Phone",
  date: "Date",
  number: "Number",
  select: "Dropdown",
  checkbox: "Checkbox",
  file: "File upload",
};

const typeChoices: readonly Choice<FieldType>[] = fieldTypes.map((type) => ({ value: type, label: fieldTypeLabels[type] }));
const typesWithPlaceholder: readonly FieldType[] = ["text", "email", "phone", "number"];

function keyError(field: Field, otherKeys: ReadonlySet<string>): string | null {
  const result = Field.shape.key.safeParse(field.key);
  if (!result.success) return field.key ? (result.error.issues[0]?.message ?? "Invalid key") : "Required";
  return otherKeys.has(field.key) ? "Another field already uses this key" : null;
}

interface FieldEditorProps {
  field: Field;
  /** Keys of every other field in the flow; keys must be unique. */
  otherKeys: ReadonlySet<string>;
  onChange: (patch: FieldPatch) => void;
}

export function FieldEditor({ field, otherKeys, onChange }: FieldEditorProps) {
  // Keys are only suggested when a field is created: renaming a label must not silently
  // change the attribute that conditions and stored answers refer to.
  const changeLabel = (label: string) => onChange({ label });
  const keyProblem = keyError(field, otherKeys);

  return (
    <div className="fc-field-editor">
      <TextField label="Label" required value={field.label} onChange={changeLabel} />
      <FormField label="Key" required error={keyProblem} hint="The company attribute the answer is stored under.">
        {(id) => (
          <Input
            id={id}
            className="fc-mono-input"
            value={field.key}
            aria-invalid={keyProblem !== null}
            onChange={(event) => onChange({ key: event.target.value })}
          />
        )}
      </FormField>
      <div className="fc-grid-2">
        <FormField label="Type">
          {(id) => <ChoiceSelect id={id} value={field.type} choices={typeChoices} onChange={(type) => onChange({ type })} />}
        </FormField>
        <div className="fc-field-editor__required">
          <Checkbox label="Required" checked={field.required} onChange={(event) => onChange({ required: event.target.checked })} />
        </div>
      </div>
      {typesWithPlaceholder.includes(field.type) && (
        <TextField label="Placeholder" value={field.placeholder ?? ""} onChange={(placeholder) => onChange({ placeholder: placeholder || undefined })} />
      )}
      <TextField label="Hint" value={field.hint ?? ""} placeholder="Shown below the input" onChange={(hint) => onChange({ hint: hint || undefined })} />
      {field.type === "select" && <OptionsEditor options={field.options ?? []} onChange={(options) => onChange({ options })} />}
      {field.type === "file" && <AcceptEditor accept={field.accept ?? []} onChange={(accept) => onChange({ accept })} />}
    </div>
  );
}

function OptionsEditor({ options, onChange }: { options: readonly FieldOption[]; onChange: (options: FieldOption[]) => void }) {
  const replace = (index: number, patch: Partial<FieldOption>) =>
    onChange(options.map((option, i) => (i === index ? { ...option, ...patch } : option)));
  const add = () => {
    const taken = new Set(options.map((option) => option.value));
    let number = options.length + 1;
    while (taken.has(`option_${number}`)) number++;
    onChange([...options, { value: `option_${number}`, label: `Option ${number}` }]);
  };

  return (
    <fieldset className="fc-subfield">
      <legend className="cf-label">Options</legend>
      {options.length === 0 && <p className="cf-error">Add at least one option.</p>}
      {options.length > 0 && (
        <div className="fc-options__head" aria-hidden>
          <span>Value</span>
          <span>Label</span>
        </div>
      )}
      {options.map((option, index) => (
        <div key={index} className="fc-options__row">
          <Input
            controlSize="sm"
            className="fc-mono-input"
            aria-label={`Option ${index + 1} value`}
            value={option.value}
            aria-invalid={!option.value}
            onChange={(event) => replace(index, { value: event.target.value })}
          />
          <Input
            controlSize="sm"
            aria-label={`Option ${index + 1} label`}
            value={option.label}
            aria-invalid={!option.label}
            onChange={(event) => replace(index, { label: event.target.value })}
          />
          <IconButton label={`Remove option ${index + 1}`} className="fc-danger-icon" onClick={() => onChange(options.filter((_, i) => i !== index))}>
            <Icon name="close" size={14} />
          </IconButton>
        </div>
      ))}
      <div>
        <Button size="sm" variant="ghost" onClick={add}>
          <Icon name="plus" size={14} /> Add option
        </Button>
      </div>
    </fieldset>
  );
}

function AcceptEditor({ accept, onChange }: { accept: readonly string[]; onChange: (accept: string[]) => void }) {
  return (
    <fieldset className="fc-subfield">
      <legend className="cf-label">Accepted files</legend>
      <div className="fc-row-wrap">
        {documentMimeTypes.map(({ mimeType, label }) => (
          <Checkbox
            key={mimeType}
            label={label}
            checked={accept.includes(mimeType)}
            onChange={(event) => onChange(event.target.checked ? [...accept, mimeType] : accept.filter((type) => type !== mimeType))}
          />
        ))}
      </div>
      {accept.length === 0 && <p className="cf-hint">Any file type is accepted.</p>}
    </fieldset>
  );
}
