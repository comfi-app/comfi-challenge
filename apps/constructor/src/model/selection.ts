import type { FlowDefinition, PublishIssue } from "@comfi/kyb-contracts";

/** What the side panel edits. A stage selection can point at one of its steps or fields. */
export type Selection =
  | { kind: "stage"; id: string; stepId?: string; fieldId?: string }
  | { kind: "transition"; id: string }
  | { kind: "ending"; id: string };

type IssueRef = NonNullable<PublishIssue["ref"]>;

/** Canvas element an issue belongs to; steps and fields resolve to their stage. */
export function selectionForRef(flow: FlowDefinition, ref: IssueRef): Selection | null {
  switch (ref.kind) {
    case "stage":
    case "transition":
    case "ending":
      return { kind: ref.kind, id: ref.id };
    case "step": {
      const stage = flow.stages.find((candidate) => candidate.steps.some((step) => step.id === ref.id));
      return stage ? { kind: "stage", id: stage.id, stepId: ref.id } : null;
    }
    case "field":
      for (const stage of flow.stages) {
        const step = stage.steps.find((candidate) => candidate.fields.some((field) => field.id === ref.id));
        if (step) return { kind: "stage", id: stage.id, stepId: step.id, fieldId: ref.id };
      }
      return null;
  }
}

/** Ids of nodes and edges that have at least one issue. */
export function flaggedElementIds(flow: FlowDefinition, issues: readonly PublishIssue[]): Set<string> {
  const ids = new Set<string>();
  for (const { ref } of issues) {
    const selection = ref && selectionForRef(flow, ref);
    if (selection) ids.add(selection.id);
  }
  return ids;
}
