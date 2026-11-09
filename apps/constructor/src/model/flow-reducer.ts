import type { Ending, Field, FlowDefinition, Stage, Step, Transition } from "@comfi/kyb-contracts";
import { documentMimeTypes } from "./factories";

export type StagePatch = Partial<Pick<Stage, "name" | "description" | "advanceGate" | "rejectEndingId" | "actions">>;
export type StepPatch = Partial<Pick<Step, "name" | "description" | "actions">>;
export type FieldPatch = Partial<Omit<Field, "id">>;
export type TransitionPatch = Partial<Pick<Transition, "target" | "combinator" | "conditions" | "priority">>;
export type EndingPatch = Partial<Pick<Ending, "name" | "outcome" | "title" | "body" | "actions">>;

/** Moves an item one slot up (-1) or down (+1). */
export type Offset = -1 | 1;

export type FlowAction =
  | { type: "flow/replace"; definition: FlowDefinition }
  | { type: "node/move"; id: string; position: Stage["position"] }
  | { type: "stage/add"; stage: Stage }
  | { type: "stage/update"; stageId: string; patch: StagePatch }
  | { type: "stage/set-entry"; stageId: string; isEntry: boolean }
  | { type: "stage/remove"; stageId: string }
  | { type: "step/add"; stageId: string; step: Step }
  | { type: "step/update"; stageId: string; stepId: string; patch: StepPatch }
  | { type: "step/move"; stageId: string; stepId: string; offset: Offset }
  | { type: "step/remove"; stageId: string; stepId: string }
  | { type: "field/add"; stageId: string; stepId: string; field: Field }
  | { type: "field/update"; stageId: string; stepId: string; fieldId: string; patch: FieldPatch }
  | { type: "field/move"; stageId: string; stepId: string; fieldId: string; offset: Offset }
  | { type: "field/remove"; stageId: string; stepId: string; fieldId: string }
  | { type: "transition/add"; transition: Transition }
  | { type: "transition/update"; transitionId: string; patch: TransitionPatch }
  | { type: "transition/remove"; transitionId: string }
  | { type: "ending/add"; ending: Ending }
  | { type: "ending/update"; endingId: string; patch: EndingPatch }
  | { type: "ending/remove"; endingId: string };

const updateById = <T extends { id: string }>(items: readonly T[], id: string, update: (item: T) => T): T[] =>
  items.map((item) => (item.id === id ? update(item) : item));

const removeById = <T extends { id: string }>(items: readonly T[], id: string): T[] => items.filter((item) => item.id !== id);

function moveById<T extends { id: string }>(items: readonly T[], id: string, offset: Offset): T[] {
  const from = items.findIndex((item) => item.id === id);
  const to = from + offset;
  if (from === -1 || to < 0 || to >= items.length) return [...items];
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item) next.splice(to, 0, item);
  return next;
}

/** Options only exist on selects and accepted types only on files. */
const normalizeField = (field: Field): Field => ({
  ...field,
  options: field.type === "select" ? (field.options ?? []) : undefined,
  accept: field.type === "file" ? (field.accept ?? documentMimeTypes.map((type) => type.mimeType)) : undefined,
});

const targetsStage = (transition: Transition, stageId: string) =>
  transition.target.type === "stage" && transition.target.stageId === stageId;

const targetsEnding = (transition: Transition, endingId: string) =>
  transition.target.type === "ending" && transition.target.endingId === endingId;

export function flowReducer(flow: FlowDefinition, action: FlowAction): FlowDefinition {
  const updateStage = (stageId: string, update: (stage: Stage) => Stage): FlowDefinition => ({
    ...flow,
    stages: updateById(flow.stages, stageId, update),
  });
  const updateSteps = (stageId: string, update: (steps: Step[]) => Step[]) =>
    updateStage(stageId, (stage) => ({ ...stage, steps: update(stage.steps) }));
  const updateFields = (stageId: string, stepId: string, update: (fields: Field[]) => Field[]) =>
    updateSteps(stageId, (steps) => updateById(steps, stepId, (step) => ({ ...step, fields: update(step.fields) })));

  switch (action.type) {
    case "flow/replace":
      return action.definition;

    case "node/move": {
      const { id, position } = action;
      return {
        ...flow,
        stages: updateById(flow.stages, id, (stage) => ({ ...stage, position })),
        endings: updateById(flow.endings, id, (ending) => ({ ...ending, position })),
      };
    }

    case "stage/add":
      return { ...flow, stages: [...flow.stages, action.stage] };
    case "stage/update":
      return updateStage(action.stageId, (stage) => ({ ...stage, ...action.patch }));
    case "stage/set-entry": {
      const { stageId, isEntry } = action;
      // A flow has a single entry stage, so marking one unmarks the rest.
      const stages = flow.stages.map((stage) => {
        if (stage.id === stageId) return { ...stage, isEntry };
        return isEntry && stage.isEntry ? { ...stage, isEntry: false } : stage;
      });
      return { ...flow, stages };
    }
    case "stage/remove":
      return {
        ...flow,
        stages: removeById(flow.stages, action.stageId),
        transitions: flow.transitions.filter(
          (transition) => transition.source !== action.stageId && !targetsStage(transition, action.stageId),
        ),
      };

    case "step/add":
      return updateSteps(action.stageId, (steps) => [...steps, action.step]);
    case "step/update":
      return updateSteps(action.stageId, (steps) => updateById(steps, action.stepId, (step) => ({ ...step, ...action.patch })));
    case "step/move":
      return updateSteps(action.stageId, (steps) => moveById(steps, action.stepId, action.offset));
    case "step/remove":
      return updateSteps(action.stageId, (steps) => removeById(steps, action.stepId));

    case "field/add":
      return updateFields(action.stageId, action.stepId, (fields) => [...fields, action.field]);
    case "field/update":
      return updateFields(action.stageId, action.stepId, (fields) =>
        updateById(fields, action.fieldId, (field) => normalizeField({ ...field, ...action.patch })),
      );
    case "field/move":
      return updateFields(action.stageId, action.stepId, (fields) => moveById(fields, action.fieldId, action.offset));
    case "field/remove":
      return updateFields(action.stageId, action.stepId, (fields) => removeById(fields, action.fieldId));

    case "transition/add":
      return { ...flow, transitions: [...flow.transitions, action.transition] };
    case "transition/update":
      return {
        ...flow,
        transitions: updateById(flow.transitions, action.transitionId, (transition) => ({ ...transition, ...action.patch })),
      };
    case "transition/remove":
      return { ...flow, transitions: removeById(flow.transitions, action.transitionId) };

    case "ending/add":
      return { ...flow, endings: [...flow.endings, action.ending] };
    case "ending/update": {
      const { endingId, patch } = action;
      const next = { ...flow, endings: updateById(flow.endings, endingId, (ending) => ({ ...ending, ...patch })) };
      // Stages may only reject into endings with a rejected outcome.
      return patch.outcome === "approved" ? clearRejectEnding(next, endingId) : next;
    }
    case "ending/remove":
      return clearRejectEnding(
        {
          ...flow,
          endings: removeById(flow.endings, action.endingId),
          transitions: flow.transitions.filter((transition) => !targetsEnding(transition, action.endingId)),
        },
        action.endingId,
      );
  }
}

function clearRejectEnding(flow: FlowDefinition, endingId: string): FlowDefinition {
  return {
    ...flow,
    stages: flow.stages.map((stage) => (stage.rejectEndingId === endingId ? { ...stage, rejectEndingId: null } : stage)),
  };
}
