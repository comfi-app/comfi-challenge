import type { Condition, FlowDefinition, PublishIssue, Stage, Transition } from "@comfi/kyb-contracts";

type RefKind = NonNullable<PublishIssue["ref"]>["kind"];

function conditionProblem(condition: Condition): string | null {
  const { operator, value } = condition;
  switch (operator) {
    case "equals":
    case "not_equals":
      return typeof value === "string" ? null : `"${operator}" needs a single value`;
    case "in":
      return Array.isArray(value) ? null : `"in" needs a list of values`;
    case "is_set":
    case "is_not_set":
      return value === undefined ? null : `"${operator}" takes no value`;
  }
}

/** Every problem that prevents a definition from being published. Empty means publishable. */
export function validateFlow(definition: FlowDefinition): PublishIssue[] {
  const issues: PublishIssue[] = [];
  const add = (code: string, message: string, kind: RefKind, id: string) => issues.push({ code, message, ref: { kind, id } });

  const { stages, transitions, endings } = definition;
  const stagesById = new Map(stages.map((stage) => [stage.id, stage]));
  const endingsById = new Map(endings.map((ending) => [ending.id, ending]));

  // Ids are unique across all element kinds so a ref is never ambiguous.
  const seenIds = new Set<string>();
  const checkId = (kind: RefKind, id: string) => {
    if (seenIds.has(id)) add("duplicate_id", `Id "${id}" is used more than once`, kind, id);
    seenIds.add(id);
  };
  const seenKeys = new Set<string>();

  const entries = stages.filter((stage) => stage.isEntry);
  if (entries.length === 0) issues.push({ code: "no_entry_stage", message: "Mark one stage as the entry stage" });
  for (const extra of entries.slice(1)) {
    add("multiple_entry_stages", `Only one stage can be the entry; "${extra.name}" is also marked`, "stage", extra.id);
  }

  for (const stage of stages) {
    checkId("stage", stage.id);
    if (stage.steps.length === 0) add("stage_without_steps", `Stage "${stage.name}" has no steps`, "stage", stage.id);

    for (const step of stage.steps) {
      checkId("step", step.id);
      if (step.fields.length === 0) add("step_without_fields", `Step "${step.name}" has no fields`, "step", step.id);

      for (const field of step.fields) {
        checkId("field", field.id);
        if (seenKeys.has(field.key)) {
          add("duplicate_field_key", `Field key "${field.key}" is used more than once`, "field", field.id);
        }
        seenKeys.add(field.key);
        if (field.type === "select" && !field.options?.length) {
          add("select_without_options", `Select "${field.label}" needs at least one option`, "field", field.id);
        }
      }
    }

    if (stage.rejectEndingId !== null) {
      const ending = endingsById.get(stage.rejectEndingId);
      if (ending?.outcome !== "rejected") {
        add(
          "invalid_reject_ending",
          `Stage "${stage.name}" must reject into an existing ending with a rejected outcome`,
          "stage",
          stage.id,
        );
      }
    } else if (stage.advanceGate === "manual") {
      add(
        "missing_reject_ending",
        `Stage "${stage.name}" is reviewed manually and needs an ending for rejections`,
        "stage",
        stage.id,
      );
    }

    if (!transitions.some((transition) => transition.source === stage.id)) {
      add("stage_without_transitions", `Stage "${stage.name}" has no outgoing transitions`, "stage", stage.id);
    }
  }

  for (const ending of endings) checkId("ending", ending.id);

  for (const transition of transitions) {
    checkId("transition", transition.id);
    if (!stagesById.has(transition.source)) {
      add("unknown_transition_source", `Transition starts at a stage that does not exist`, "transition", transition.id);
    }
    const { target } = transition;
    const targetExists = target.type === "stage" ? stagesById.has(target.stageId) : endingsById.has(target.endingId);
    if (!targetExists) {
      add("unknown_transition_target", `Transition points to a ${target.type} that does not exist`, "transition", transition.id);
    }
    for (const condition of transition.conditions) {
      const problem = conditionProblem(condition);
      if (problem) {
        add("invalid_condition", `Condition on "${condition.attribute}": ${problem}`, "transition", transition.id);
      }
    }
  }

  issues.push(...graphIssues(stages, transitions, entries.length === 1 ? entries[0] : undefined));
  return issues;
}

/** Cycles between stages and stages that can never be reached from the entry. */
function graphIssues(stages: readonly Stage[], transitions: readonly Transition[], entry: Stage | undefined): PublishIssue[] {
  const issues: PublishIssue[] = [];
  const edges = new Map<string, { transitionId: string; to: string }[]>(stages.map((stage) => [stage.id, []]));
  for (const { id, source, target } of transitions) {
    if (target.type === "stage" && edges.has(target.stageId)) {
      edges.get(source)?.push({ transitionId: id, to: target.stageId });
    }
  }

  const state = new Map<string, "visiting" | "done">();
  const visit = (stageId: string) => {
    state.set(stageId, "visiting");
    for (const { transitionId, to } of edges.get(stageId) ?? []) {
      const next = state.get(to);
      if (next === "visiting") {
        issues.push({
          code: "stage_cycle",
          message: "Transition loops back to an earlier stage",
          ref: { kind: "transition", id: transitionId },
        });
      } else if (next === undefined) visit(to);
    }
    state.set(stageId, "done");
  };
  for (const stage of stages) if (!state.has(stage.id)) visit(stage.id);

  if (!entry) return issues;
  const reachable = new Set([entry.id]);
  const toVisit = [entry.id];
  for (let stageId = toVisit.shift(); stageId !== undefined; stageId = toVisit.shift()) {
    for (const { to } of edges.get(stageId) ?? []) {
      if (reachable.has(to)) continue;
      reachable.add(to);
      toVisit.push(to);
    }
  }
  for (const stage of stages) {
    if (!reachable.has(stage.id)) {
      issues.push({
        code: "unreachable_stage",
        message: `Stage "${stage.name}" cannot be reached from the entry stage`,
        ref: { kind: "stage", id: stage.id },
      });
    }
  }
  return issues;
}
