import type { AdvanceGate, Field, FlowDefinition, Stage } from "@comfi/kyb-contracts";
import { Button, Checkbox, FormField, Select } from "@comfi/ui";
import { useState, type Dispatch } from "react";
import { Icon } from "../icons";
import { createStep } from "../model/factories";
import type { FlowAction, StagePatch } from "../model/flow-reducer";
import { ActionsEditor } from "./ActionsEditor";
import { ChoiceSelect, PanelHeader, PanelSection, TextField, type Choice } from "./controls";
import { StepItem } from "./StepItem";

const gates: readonly Choice<AdvanceGate>[] = [
  { value: "open", label: "Auto-advance" },
  { value: "manual", label: "Manual review" },
];

const gateHints: Record<AdvanceGate, string> = {
  open: "Moves on as soon as the applicant submits the last step.",
  manual: "Waits for an operator to approve, return or reject.",
};

interface StagePanelProps {
  stage: Stage;
  definition: FlowDefinition;
  fields: readonly Field[];
  dispatch: Dispatch<FlowAction>;
  focus: { stepId?: string; fieldId?: string };
  /** Read-only views cannot toggle sections, so everything is shown. */
  expandAll: boolean;
  onDelete: () => void;
}

export function StagePanel({ stage, definition, fields, dispatch, focus, expandAll, onDelete }: StagePanelProps) {
  const [openStepId, setOpenStepId] = useState<string | null>(focus.stepId ?? stage.steps[0]?.id ?? null);
  const update = (patch: StagePatch) => dispatch({ type: "stage/update", stageId: stage.id, patch });
  const rejectedEndings = definition.endings.filter((ending) => ending.outcome === "rejected");

  const addStep = () => {
    const step = createStep(stage, new Set(fields.map((field) => field.key)));
    dispatch({ type: "step/add", stageId: stage.id, step });
    setOpenStepId(step.id);
  };

  return (
    <div className="fc-panel">
      <PanelHeader eyebrow="Stage" title={stage.name || "Untitled stage"} onDelete={onDelete} />

      <PanelSection title="Details">
        <TextField label="Name" required value={stage.name} onChange={(name) => update({ name })} />
        <TextField
          label="Description"
          multiline
          value={stage.description ?? ""}
          onChange={(description) => update({ description: description || undefined })}
        />
        <Checkbox
          label={
            <span>
              Entry stage
              <span className="cf-hint fc-block">Applicants start here. Only one stage can be the entry.</span>
            </span>
          }
          checked={stage.isEntry}
          onChange={(event) => dispatch({ type: "stage/set-entry", stageId: stage.id, isEntry: event.target.checked })}
        />
      </PanelSection>

      <PanelSection title="Review">
        <FormField label="When the applicant submits" hint={gateHints[stage.advanceGate]}>
          {(id) => <ChoiceSelect id={id} value={stage.advanceGate} choices={gates} onChange={(advanceGate) => update({ advanceGate })} />}
        </FormField>
        <FormField
          label="Rejection ending"
          required={stage.advanceGate === "manual"}
          error={stage.advanceGate === "manual" && !stage.rejectEndingId ? "Manual review needs an ending for rejections" : null}
          hint="Where the application goes when an operator rejects it."
        >
          {(id) => (
            <Select id={id} value={stage.rejectEndingId ?? ""} onChange={(event) => update({ rejectEndingId: event.target.value || null })}>
              <option value="">None</option>
              {rejectedEndings.map((ending) => (
                <option key={ending.id} value={ending.id}>
                  {ending.name}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </PanelSection>

      <PanelSection title="Steps" hint="Pages the applicant fills in, in this order.">
        {stage.steps.length === 0 && <p className="cf-error">A stage needs at least one step.</p>}
        <ol className="fc-list">
          {stage.steps.map((step, index) => (
            <StepItem
              key={step.id}
              stageId={stage.id}
              step={step}
              index={index}
              count={stage.steps.length}
              isOpen={expandAll || openStepId === step.id}
              expandFields={expandAll}
              onToggle={() => setOpenStepId((current) => (current === step.id ? null : step.id))}
              focusFieldId={step.id === focus.stepId ? focus.fieldId : undefined}
              fields={fields}
              dispatch={dispatch}
            />
          ))}
        </ol>
        <div>
          <Button size="sm" onClick={addStep}>
            <Icon name="plus" size={14} /> Add step
          </Button>
        </div>
      </PanelSection>

      <PanelSection title="Actions" hint="Run when the applicant submits the last step of this stage.">
        <ActionsEditor actions={stage.actions} fields={fields} emptyText="No actions." onChange={(actions) => update({ actions })} />
      </PanelSection>
    </div>
  );
}
