import type { Field, Step } from "@comfi/kyb-contracts";
import { Button, cx } from "@comfi/ui";
import { useState, type Dispatch } from "react";
import { plural } from "../format";
import { Icon } from "../icons";
import { createField } from "../model/factories";
import type { FieldPatch, FlowAction, Offset } from "../model/flow-reducer";
import { ActionsEditor } from "./ActionsEditor";
import { ReorderControls, TextField } from "./controls";
import { FieldEditor, fieldTypeLabels } from "./FieldEditor";

interface StepItemProps {
  stageId: string;
  step: Step;
  index: number;
  count: number;
  isOpen: boolean;
  expandFields: boolean;
  onToggle: () => void;
  /** Field to expand initially, e.g. when jumping to a validation issue. */
  focusFieldId?: string;
  fields: readonly Field[];
  dispatch: Dispatch<FlowAction>;
}

export function StepItem({ stageId, step, index, count, isOpen, expandFields, onToggle, focusFieldId, fields, dispatch }: StepItemProps) {
  const [openFieldId, setOpenFieldId] = useState<string | null>(focusFieldId ?? null);
  const stepRef = { stageId, stepId: step.id };

  const addField = () => {
    const field = createField(step, new Set(fields.map((candidate) => candidate.key)));
    dispatch({ type: "field/add", ...stepRef, field });
    setOpenFieldId(field.id);
  };

  return (
    <li className={cx("fc-item", isOpen && "is-open")}>
      <div className="fc-item__head">
        <button type="button" className="fc-item__toggle" aria-expanded={isOpen} onClick={onToggle}>
          <span className="fc-item__chevron">
            <Icon name="chevron" size={14} />
          </span>
          <span className="fc-item__name">{step.name || "Untitled step"}</span>
          <span className="fc-item__meta">{plural(step.fields.length, "field")}</span>
        </button>
        <ReorderControls
          itemLabel={`step “${step.name}”`}
          index={index}
          count={count}
          onMove={(offset) => dispatch({ type: "step/move", ...stepRef, offset })}
          onRemove={() => dispatch({ type: "step/remove", ...stepRef })}
        />
      </div>

      {isOpen && (
        <div className="fc-item__body">
          <TextField label="Step name" required value={step.name} onChange={(name) => dispatch({ type: "step/update", ...stepRef, patch: { name } })} />
          <TextField
            label="Description"
            value={step.description ?? ""}
            placeholder="Shown to the applicant under the step title"
            onChange={(description) => dispatch({ type: "step/update", ...stepRef, patch: { description: description || undefined } })}
          />

          <div className="fc-subsection">
            <div className="fc-subsection__title">Fields</div>
            {step.fields.length === 0 && <p className="cf-error">A step needs at least one field.</p>}
            <ul className="fc-list">
              {step.fields.map((field, fieldIndex) => (
                <FieldItem
                  key={field.id}
                  field={field}
                  step={step}
                  index={fieldIndex}
                  isOpen={expandFields || openFieldId === field.id}
                  onToggle={() => setOpenFieldId((current) => (current === field.id ? null : field.id))}
                  otherKeys={new Set(fields.filter((other) => other.id !== field.id).map((other) => other.key))}
                  onMove={(offset) => dispatch({ type: "field/move", ...stepRef, fieldId: field.id, offset })}
                  onRemove={() => dispatch({ type: "field/remove", ...stepRef, fieldId: field.id })}
                  onChange={(patch) => dispatch({ type: "field/update", ...stepRef, fieldId: field.id, patch })}
                />
              ))}
            </ul>
            <div>
              <Button size="sm" variant="ghost" onClick={addField}>
                <Icon name="plus" size={14} /> Add field
              </Button>
            </div>
          </div>

          <div className="fc-subsection">
            <div className="fc-subsection__title">Actions when the step is submitted</div>
            <ActionsEditor
              actions={step.actions}
              fields={fields}
              emptyText="No actions."
              onChange={(actions) => dispatch({ type: "step/update", ...stepRef, patch: { actions } })}
            />
          </div>
        </div>
      )}
    </li>
  );
}

interface FieldItemProps {
  field: Field;
  step: Step;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  otherKeys: ReadonlySet<string>;
  onMove: (offset: Offset) => void;
  onRemove: () => void;
  onChange: (patch: FieldPatch) => void;
}

function FieldItem({ field, step, index, isOpen, onToggle, otherKeys, onMove, onRemove, onChange }: FieldItemProps) {
  return (
    <li className={cx("fc-item fc-item--field", isOpen && "is-open")}>
      <div className="fc-item__head">
        <button type="button" className="fc-item__toggle" aria-expanded={isOpen} onClick={onToggle}>
          <span className="fc-item__chevron">
            <Icon name="chevron" size={14} />
          </span>
          <span className="fc-item__name">
            {field.label || "Untitled field"}
            {field.required && <span className="cf-label__req">*</span>}
          </span>
          <span className="fc-item__meta">{fieldTypeLabels[field.type]}</span>
        </button>
        <ReorderControls itemLabel={`field “${field.label}”`} index={index} count={step.fields.length} onMove={onMove} onRemove={onRemove} />
      </div>
      {isOpen && (
        <div className="fc-item__body">
          <FieldEditor field={field} otherKeys={otherKeys} onChange={onChange} />
        </div>
      )}
    </li>
  );
}
