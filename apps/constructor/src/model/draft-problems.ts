import { FlowDefinition, type PublishIssue } from "@comfi/kyb-contracts";
import { targetName } from "./selectors";

interface Located {
  ref: NonNullable<PublishIssue["ref"]>;
  subject: string;
}

const quoted = (name: string, fallback: string) => (name.trim() ? `"${name}"` : fallback);

/** Finds the innermost canvas element a schema path such as `stages.0.steps.1.fields.2.key` points into. */
function locate(flow: FlowDefinition, path: readonly PropertyKey[]): Located | null {
  const [collection, index, ...rest] = path;
  if (typeof index !== "number") return null;

  if (collection === "stages") {
    const stage = flow.stages[index];
    if (!stage) return null;
    const [, stepIndex, , fieldIndex] = rest;
    const step = rest[0] === "steps" && typeof stepIndex === "number" ? stage.steps[stepIndex] : undefined;
    const field = step && rest[2] === "fields" && typeof fieldIndex === "number" ? step.fields[fieldIndex] : undefined;
    if (field) return { ref: { kind: "field", id: field.id }, subject: `Field ${quoted(field.label, "without a label")}` };
    if (step) return { ref: { kind: "step", id: step.id }, subject: `Step ${quoted(step.name, "without a name")}` };
    return { ref: { kind: "stage", id: stage.id }, subject: `Stage ${quoted(stage.name, "without a name")}` };
  }
  if (collection === "transitions") {
    const transition = flow.transitions[index];
    return transition
      ? { ref: { kind: "transition", id: transition.id }, subject: `Transition to ${targetName(flow, transition.target)}` }
      : null;
  }
  if (collection === "endings") {
    const ending = flow.endings[index];
    return ending ? { ref: { kind: "ending", id: ending.id }, subject: `Ending ${quoted(ending.name, "without a name")}` } : null;
  }
  return null;
}

/** Problems that stop the draft from being saved at all, in the same shape as publish issues. */
export function draftProblems(flow: FlowDefinition): PublishIssue[] {
  const result = FlowDefinition.safeParse(flow);
  if (result.success) return [];
  return result.error.issues.map((issue) => {
    const located = locate(flow, issue.path);
    const property = String(issue.path.findLast((segment) => typeof segment === "string") ?? "value");
    const problem = issue.code === "too_small" ? `${property} is required` : `${property}: ${issue.message}`;
    return {
      code: "invalid_draft",
      message: located ? `${located.subject}: ${problem}` : problem,
      ref: located?.ref,
    };
  });
}
