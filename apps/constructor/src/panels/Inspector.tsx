import type { Field, FlowDefinition } from "@comfi/kyb-contracts";
import { useMemo, type Dispatch, type ReactNode } from "react";
import { plural } from "../format";
import type { FlowAction } from "../model/flow-reducer";
import { allFields } from "../model/selectors";
import type { Selection } from "../model/selection";
import { EndingPanel } from "./EndingPanel";
import { StagePanel } from "./StagePanel";
import { TransitionPanel } from "./TransitionPanel";

interface InspectorProps {
  definition: FlowDefinition;
  selection: Selection | null;
  dispatch: Dispatch<FlowAction>;
  readOnly: boolean;
  onDelete: (selection: Selection) => void;
}

export function Inspector({ definition, selection, dispatch, readOnly, onDelete }: InspectorProps) {
  const fields = useMemo(() => allFields(definition), [definition]);

  const panel = selectedPanel({ definition, selection, fields, dispatch, readOnly, onDelete });

  return (
    <aside className="fc-inspector" aria-label="Properties">
      {panel ? (
        // A disabled fieldset turns every control inside it read-only at once.
        <fieldset className="fc-inspector__fieldset" disabled={readOnly}>
          {panel}
        </fieldset>
      ) : (
        <InspectorOverview definition={definition} readOnly={readOnly} />
      )}
    </aside>
  );
}

type PanelProps = InspectorProps & { fields: readonly Field[] };

/** Editor for the selected element, or null when nothing (or something since deleted) is selected. */
function selectedPanel({ definition, selection, fields, dispatch, readOnly, onDelete }: PanelProps): ReactNode {
  switch (selection?.kind) {
    case "stage": {
      const stage = definition.stages.find((candidate) => candidate.id === selection.id);
      return (
        stage && (
          <StagePanel
            key={`${stage.id}:${selection.stepId ?? ""}:${selection.fieldId ?? ""}`}
            stage={stage}
            definition={definition}
            fields={fields}
            dispatch={dispatch}
            focus={selection}
            expandAll={readOnly}
            onDelete={() => onDelete(selection)}
          />
        )
      );
    }
    case "transition": {
      const transition = definition.transitions.find((candidate) => candidate.id === selection.id);
      return (
        transition && (
          <TransitionPanel
            key={transition.id}
            transition={transition}
            definition={definition}
            fields={fields}
            dispatch={dispatch}
            onDelete={() => onDelete(selection)}
          />
        )
      );
    }
    case "ending": {
      const ending = definition.endings.find((candidate) => candidate.id === selection.id);
      return ending && <EndingPanel key={ending.id} ending={ending} fields={fields} dispatch={dispatch} onDelete={() => onDelete(selection)} />;
    }
    case undefined:
      return null;
  }
}

function InspectorOverview({ definition, readOnly }: { definition: FlowDefinition; readOnly: boolean }) {
  const { stages, transitions, endings } = definition;
  return (
    <div className="fc-panel fc-overview">
      <header className="fc-panel__header">
        <div className="fc-panel__heading">
          <span className="fc-panel__eyebrow">Overview</span>
          <h2 className="fc-panel__title">
            {plural(stages.length, "stage")}, {plural(transitions.length, "transition")}, {plural(endings.length, "ending")}
          </h2>
        </div>
      </header>
      <p className="fc-muted">Select a stage, transition or ending on the canvas to see its settings.</p>
      {!readOnly && (
        <ul className="fc-tips">
          <li>Drag from the right edge of a stage to another stage or an ending to add a transition.</li>
          <li>Transitions from a stage are checked by priority; the first one whose conditions match wins.</li>
          <li>
            Press <kbd>Delete</kbd> to remove the selected element and <kbd>⌘ S</kbd> to save the draft.
          </li>
        </ul>
      )}
    </div>
  );
}
