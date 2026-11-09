import type { Ending, EndingOutcome, Field } from "@comfi/kyb-contracts";
import { FormField } from "@comfi/ui";
import type { Dispatch } from "react";
import type { EndingPatch, FlowAction } from "../model/flow-reducer";
import { ActionsEditor } from "./ActionsEditor";
import { ChoiceSelect, PanelHeader, PanelSection, TextField, type Choice } from "./controls";

const outcomes: readonly Choice<EndingOutcome>[] = [
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

interface EndingPanelProps {
  ending: Ending;
  fields: readonly Field[];
  dispatch: Dispatch<FlowAction>;
  onDelete: () => void;
}

export function EndingPanel({ ending, fields, dispatch, onDelete }: EndingPanelProps) {
  const update = (patch: EndingPatch) => dispatch({ type: "ending/update", endingId: ending.id, patch });
  return (
    <div className="fc-panel">
      <PanelHeader eyebrow="Ending" title={ending.name || "Untitled ending"} onDelete={onDelete} />

      <PanelSection title="Details">
        <TextField label="Name" required value={ending.name} onChange={(name) => update({ name })} hint="Only visible to the operations team." />
        <FormField label="Outcome" hint="Rejected endings can receive operator rejections.">
          {(id) => <ChoiceSelect id={id} value={ending.outcome} choices={outcomes} onChange={(outcome) => update({ outcome })} />}
        </FormField>
      </PanelSection>

      <PanelSection title="Message to the applicant">
        <TextField label="Title" required value={ending.title} onChange={(title) => update({ title })} />
        <TextField label="Body" multiline value={ending.body} onChange={(body) => update({ body })} />
      </PanelSection>

      <PanelSection title="Actions" hint="Run when an application reaches this ending.">
        <ActionsEditor actions={ending.actions} fields={fields} emptyText="No actions." onChange={(actions) => update({ actions })} />
      </PanelSection>
    </div>
  );
}
