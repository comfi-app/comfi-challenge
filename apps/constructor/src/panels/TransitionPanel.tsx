import type { Condition, Field, FieldOption, FlowDefinition, Transition, TransitionTarget } from "@comfi/kyb-contracts";
import { Button, Checkbox, FormField, IconButton, Input, Select } from "@comfi/ui";
import type { Dispatch } from "react";
import { Icon } from "../icons";
import { operatorArity, operators, withOperator } from "../model/conditions";
import { createCondition } from "../model/factories";
import type { FlowAction, TransitionPatch } from "../model/flow-reducer";
import { outgoingTransitions, targetName } from "../model/selectors";
import { AttributeInput, ChoiceSelect, PanelHeader, PanelSection, ValuesInput, type Choice } from "./controls";

const combinators: readonly Choice<Transition["combinator"]>[] = [
  { value: "all", label: "All conditions match" },
  { value: "any", label: "Any condition matches" },
];

const checkboxOptions: FieldOption[] = [
  { value: "true", label: "Checked" },
  { value: "false", label: "Not checked" },
];

/** Values a condition on this field can meaningfully compare against, when the field has a fixed set. */
function knownValues(field: Field | undefined): readonly FieldOption[] | null {
  if (field?.type === "select") return field.options ?? [];
  if (field?.type === "checkbox") return checkboxOptions;
  return null;
}

interface TargetOption {
  key: string;
  group: "Stages" | "Endings";
  label: string;
  target: TransitionTarget;
}

const targetGroups: readonly TargetOption["group"][] = ["Stages", "Endings"];

interface TransitionPanelProps {
  transition: Transition;
  definition: FlowDefinition;
  fields: readonly Field[];
  dispatch: Dispatch<FlowAction>;
  onDelete: () => void;
}

export function TransitionPanel({ transition, definition, fields, dispatch, onDelete }: TransitionPanelProps) {
  const update = (patch: TransitionPatch) => dispatch({ type: "transition/update", transitionId: transition.id, patch });
  const setConditions = (conditions: Condition[]) => update({ conditions });

  const sourceName = definition.stages.find((stage) => stage.id === transition.source)?.name ?? "Missing stage";
  const siblings = outgoingTransitions(definition, transition.source);
  const order = siblings.findIndex((sibling) => sibling.id === transition.id) + 1;

  const targets: TargetOption[] = [
    ...definition.stages
      .filter((stage) => stage.id !== transition.source)
      .map((stage): TargetOption => ({ key: `stage:${stage.id}`, group: "Stages", label: stage.name, target: { type: "stage", stageId: stage.id } })),
    ...definition.endings.map(
      (ending): TargetOption => ({ key: `ending:${ending.id}`, group: "Endings", label: ending.name, target: { type: "ending", endingId: ending.id } }),
    ),
  ];
  const { target } = transition;
  const targetKey = target.type === "stage" ? `stage:${target.stageId}` : `ending:${target.endingId}`;

  return (
    <div className="fc-panel">
      <PanelHeader eyebrow="Transition" title={`${sourceName} → ${targetName(definition, target)}`} onDelete={onDelete} />

      <PanelSection title="Route">
        <FormField label="Goes to" required>
          {(id) => (
            <Select
              id={id}
              value={targetKey}
              onChange={(event) => {
                const next = targets.find((option) => option.key === event.target.value);
                if (next) update({ target: next.target });
              }}
            >
              {targetGroups.map((group) => (
                <optgroup key={group} label={group}>
                  {targets
                    .filter((option) => option.group === group)
                    .map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
          )}
        </FormField>
        <FormField
          label="Priority"
          hint={`Lower runs first. This is check ${order} of ${siblings.length} after “${sourceName}”; the first match wins.`}
        >
          {(id) => (
            <Input
              id={id}
              type="number"
              step={10}
              value={transition.priority}
              onChange={(event) => {
                const priority = Number.parseInt(event.target.value, 10);
                if (Number.isFinite(priority)) update({ priority });
              }}
            />
          )}
        </FormField>
      </PanelSection>

      <PanelSection
        title="Conditions"
        hint={transition.conditions.length === 0 ? "No conditions: this transition always matches." : "Compared against the company's answers."}
      >
        {transition.conditions.length > 1 && (
          <ChoiceSelect aria-label="Combine conditions" value={transition.combinator} choices={combinators} onChange={(combinator) => update({ combinator })} />
        )}
        <div className="fc-conditions">
          {transition.conditions.map((condition, index) => (
            <ConditionRow
              key={index}
              condition={condition}
              fields={fields}
              onChange={(next) => setConditions(transition.conditions.map((current, i) => (i === index ? next : current)))}
              onRemove={() => setConditions(transition.conditions.filter((_, i) => i !== index))}
            />
          ))}
        </div>
        <div>
          <Button size="sm" variant="ghost" onClick={() => setConditions([...transition.conditions, createCondition()])}>
            <Icon name="plus" size={14} /> Add condition
          </Button>
        </div>
      </PanelSection>
    </div>
  );
}

interface ConditionRowProps {
  condition: Condition;
  fields: readonly Field[];
  onChange: (condition: Condition) => void;
  onRemove: () => void;
}

function ConditionRow({ condition, fields, onChange, onRemove }: ConditionRowProps) {
  const field = fields.find((candidate) => candidate.key === condition.attribute);
  return (
    <div className="fc-condition">
      <div className="fc-condition__line">
        <AttributeInput label="Attribute" fields={fields} value={condition.attribute} onChange={(attribute) => onChange({ ...condition, attribute })} />
        <IconButton label="Remove condition" className="fc-danger-icon" onClick={onRemove}>
          <Icon name="close" size={14} />
        </IconButton>
      </div>
      <ChoiceSelect
        controlSize="sm"
        aria-label="Operator"
        value={condition.operator}
        choices={operators}
        onChange={(operator) => onChange(withOperator(condition, operator))}
      />
      <ConditionValue condition={condition} options={knownValues(field)} onChange={onChange} />
    </div>
  );
}

interface ConditionValueProps {
  condition: Condition;
  options: readonly FieldOption[] | null;
  onChange: (condition: Condition) => void;
}

function ConditionValue({ condition, options, onChange }: ConditionValueProps) {
  const { value } = condition;
  switch (operatorArity(condition.operator)) {
    case "none":
      return null;

    case "one": {
      const current = typeof value === "string" ? value : "";
      if (!options) {
        return <Input controlSize="sm" aria-label="Value" placeholder="Value" value={current} onChange={(event) => onChange({ ...condition, value: event.target.value })} />;
      }
      const isKnown = options.some((option) => option.value === current);
      return (
        <Select controlSize="sm" aria-label="Value" value={current} onChange={(event) => onChange({ ...condition, value: event.target.value })}>
          {!current && <option value="">Choose a value…</option>}
          {current && !isKnown && <option value={current}>{current} (not an option)</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );
    }

    case "many": {
      const current = Array.isArray(value) ? value : [];
      if (!options) return <ValuesInput label="Values" values={current} onChange={(values) => onChange({ ...condition, value: values })} />;
      const toggle = (optionValue: string, checked: boolean) =>
        onChange({ ...condition, value: checked ? [...current, optionValue] : current.filter((item) => item !== optionValue) });
      return (
        <div className="fc-option-checks" role="group" aria-label="Values">
          {options.map((option) => (
            <Checkbox
              key={option.value}
              label={option.label}
              checked={current.includes(option.value)}
              onChange={(event) => toggle(option.value, event.target.checked)}
            />
          ))}
        </div>
      );
    }
  }
}
