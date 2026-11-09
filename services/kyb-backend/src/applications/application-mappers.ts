import type { ApplicationStatus, ApplicationStep, Decision, Stage, StepStatus, StepValues } from "@comfi/kyb-contracts";

export interface ApplicationRow {
  id: string;
  run_id: string;
  stage_id: string;
  status: ApplicationStatus;
  submitted_at: Date | null;
  decision_kind: Decision["kind"] | null;
  decision_comment: string | null;
  decided_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ApplicationStepRow {
  application_id: string;
  step_id: string;
  status: StepStatus;
  values: StepValues;
  submitted_at: Date | null;
}

export const toDecision = (row: ApplicationRow): Decision | null =>
  row.decision_kind && row.decided_at
    ? { kind: row.decision_kind, comment: row.decision_comment, at: row.decided_at.toISOString() }
    : null;

/** Steps of an application in the order the stage defines them. */
export function toApplicationSteps(stage: Stage, rows: readonly ApplicationStepRow[]): ApplicationStep[] {
  const byStepId = new Map(rows.map((row) => [row.step_id, row]));
  return stage.steps.map((step) => {
    const row = byStepId.get(step.id);
    return {
      stepId: step.id,
      status: row?.status ?? "pending",
      submittedAt: row?.submitted_at?.toISOString() ?? null,
      values: row?.values ?? {},
    };
  });
}
