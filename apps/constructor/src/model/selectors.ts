import type { Field, FlowDefinition, Stage, Transition } from "@comfi/kyb-contracts";

export const allFields = (flow: FlowDefinition): Field[] =>
  flow.stages.flatMap((stage) => stage.steps.flatMap((step) => step.fields));

export const outgoingTransitions = (flow: FlowDefinition, stageId: string): Transition[] =>
  flow.transitions.filter((transition) => transition.source === stageId).sort((a, b) => a.priority - b.priority);

/** Priority for a new transition so it runs after the existing ones of its stage. */
export function nextPriority(flow: FlowDefinition, stageId: string): number {
  const priorities = outgoingTransitions(flow, stageId).map((transition) => transition.priority);
  return priorities.length === 0 ? 10 : Math.max(...priorities) + 10;
}

export function targetName(flow: FlowDefinition, target: Transition["target"]): string {
  const element =
    target.type === "stage"
      ? flow.stages.find((stage) => stage.id === target.stageId)
      : flow.endings.find((ending) => ending.id === target.endingId);
  return element?.name ?? "Missing element";
}

export const actionCount = (stage: Stage): number =>
  stage.actions.length + stage.steps.reduce((sum, step) => sum + step.actions.length, 0);

/** Transition target for a canvas node id, or null when the id is neither a stage nor an ending. */
export function targetForNode(flow: FlowDefinition, nodeId: string): Transition["target"] | null {
  if (flow.stages.some((stage) => stage.id === nodeId)) return { type: "stage", stageId: nodeId };
  if (flow.endings.some((ending) => ending.id === nodeId)) return { type: "ending", endingId: nodeId };
  return null;
}
