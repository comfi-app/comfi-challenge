import type { Action, Field } from "@comfi/kyb-contracts";
import { Button, IconButton, Input } from "@comfi/ui";
import { Icon } from "../icons";
import { createAction } from "../model/factories";
import { AttributeInput, ChoiceSelect, type Choice } from "./controls";

type Recipient = Extract<Action, { type: "notify" }>["recipient"];

const actionLabels: Record<Action["type"], string> = { set_attribute: "Set attribute", notify: "Notify" };
const recipients: readonly Choice<Recipient>[] = [
  { value: "applicant", label: "Applicant" },
  { value: "operations", label: "Operations team" },
];

interface ActionsEditorProps {
  actions: readonly Action[];
  onChange: (actions: Action[]) => void;
  fields: readonly Field[];
  /** Shown when there are no actions, e.g. "Nothing runs when the step is submitted." */
  emptyText: string;
}

export function ActionsEditor({ actions, onChange, fields, emptyText }: ActionsEditorProps) {
  const replace = (index: number, action: Action) => onChange(actions.map((current, i) => (i === index ? action : current)));
  const remove = (index: number) => onChange(actions.filter((_, i) => i !== index));
  const add = (type: Action["type"]) => onChange([...actions, createAction(type)]);

  return (
    <div className="fc-actions">
      {actions.length === 0 && <p className="fc-empty-line">{emptyText}</p>}
      {actions.map((action, index) => (
        <div key={index} className="fc-action">
          <div className="fc-action__head">
            <span className="fc-action__type">{actionLabels[action.type]}</span>
            <IconButton label={`Delete ${actionLabels[action.type].toLowerCase()} action`} className="fc-danger-icon" onClick={() => remove(index)}>
              <Icon name="trash" size={14} />
            </IconButton>
          </div>
          <ActionFields action={action} fields={fields} onChange={(next) => replace(index, next)} />
        </div>
      ))}
      <div className="fc-row-wrap">
        <Button size="sm" variant="ghost" onClick={() => add("set_attribute")}>
          <Icon name="plus" size={14} /> Set attribute
        </Button>
        <Button size="sm" variant="ghost" onClick={() => add("notify")}>
          <Icon name="plus" size={14} /> Notify
        </Button>
      </div>
    </div>
  );
}

function ActionFields({ action, fields, onChange }: { action: Action; fields: readonly Field[]; onChange: (action: Action) => void }) {
  switch (action.type) {
    case "set_attribute":
      return (
        <div className="fc-action__grid">
          <AttributeInput label="Attribute" fields={fields} value={action.attribute} onChange={(attribute) => onChange({ ...action, attribute })} />
          <Input controlSize="sm" aria-label="Value" placeholder="Value" value={action.value} onChange={(event) => onChange({ ...action, value: event.target.value })} />
        </div>
      );
    case "notify":
      return (
        <div className="fc-action__grid">
          <Input
            controlSize="sm"
            aria-label="Template"
            placeholder="Template, e.g. welcome"
            className="fc-mono-input"
            value={action.template}
            aria-invalid={!action.template.trim()}
            onChange={(event) => onChange({ ...action, template: event.target.value })}
          />
          <ChoiceSelect
            controlSize="sm"
            aria-label="Recipient"
            value={action.recipient}
            choices={recipients}
            onChange={(recipient) => onChange({ ...action, recipient })}
          />
        </div>
      );
  }
}
