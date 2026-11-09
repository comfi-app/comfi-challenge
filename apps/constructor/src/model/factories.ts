import type { Action, Condition, Ending, EndingOutcome, Field, Stage, Step, Transition, TransitionTarget } from "@comfi/kyb-contracts";
import { newId } from "./ids";
import { suggestFieldKey } from "./naming";

interface Position {
  x: number;
  y: number;
}

export const documentMimeTypes = [
  { mimeType: "application/pdf", label: "PDF" },
  { mimeType: "image/png", label: "PNG" },
  { mimeType: "image/jpeg", label: "JPG" },
] as const;

/** Keys already used in the flow; new fields pick a label whose suggested key is still free. */
type TakenKeys = ReadonlySet<string>;

export function createField(step: Step, takenKeys: TakenKeys): Field {
  let number = step.fields.length + 1;
  while (takenKeys.has(suggestFieldKey(step.name, `Field ${number}`))) number += 1;
  const label = `Field ${number}`;
  return { id: newId("field"), key: suggestFieldKey(step.name, label), label, type: "text", required: true };
}

export function createStep(stage: Stage, takenKeys: TakenKeys): Step {
  const step: Step = { id: newId("step"), name: `Step ${stage.steps.length + 1}`, fields: [], actions: [] };
  return { ...step, fields: [createField(step, takenKeys)] };
}

export function createStage(position: Position, isEntry: boolean, takenKeys: TakenKeys): Stage {
  const stage: Stage = {
    id: newId("stage"),
    name: "New stage",
    isEntry,
    advanceGate: "open",
    rejectEndingId: null,
    steps: [],
    actions: [],
    position,
  };
  return { ...stage, steps: [createStep(stage, takenKeys)] };
}

export function createEnding(position: Position, outcome: EndingOutcome): Ending {
  return outcome === "approved"
    ? { id: newId("ending"), name: "Approved", outcome, title: "You're all set", body: "", actions: [], position }
    : { id: newId("ending"), name: "Rejected", outcome, title: "Application not approved", body: "", actions: [], position };
}

export function createTransition(source: string, target: TransitionTarget, priority: number): Transition {
  return { id: newId("tr"), source, target, combinator: "all", conditions: [], priority };
}

export function createCondition(): Condition {
  return { attribute: "", operator: "equals", value: "" };
}

export function createAction(type: Action["type"]): Action {
  switch (type) {
    case "set_attribute":
      return { type, attribute: "", value: "" };
    case "notify":
      return { type, template: "", recipient: "applicant" };
  }
}
