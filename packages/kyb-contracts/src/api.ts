import { z } from "zod";
import { FlowDefinition, type Ending, type EndingOutcome, type Stage } from "./flow";
import { StepValues, type FieldValue, type FileRef, type JsonValue } from "./values";

// ---------- shared ----------

export type ApplicationStatus = "in_progress" | "in_review" | "returned" | "approved" | "rejected";
export const applicationStatuses: readonly ApplicationStatus[] = [
  "in_progress",
  "in_review",
  "returned",
  "approved",
  "rejected",
];
export type RunStatus = "active" | "completed" | "blocked";
export type StepStatus = "pending" | "submitted";
export type Actor = "applicant" | "operator" | "system";

export type EventType =
  | "run.started"
  | "run.routed"
  | "run.completed"
  | "run.blocked"
  | "file.uploaded"
  | "step.submitted"
  | "application.submitted"
  | "application.approved"
  | "application.rejected"
  | "application.returned"
  | "attribute.set"
  | "notification.queued";

export interface TimelineEvent {
  id: string;
  type: EventType;
  actor: Actor;
  runId: string | null;
  applicationId: string | null;
  payload: { [key: string]: JsonValue };
  createdAt: string;
}

export interface PublishIssue {
  code: string;
  message: string;
  ref?: { kind: "stage" | "step" | "field" | "transition" | "ending"; id: string };
}

/** Body of every non-2xx response. */
export interface ApiErrorBody {
  statusCode: number;
  message: string;
  issues?: PublishIssue[];
  fieldErrors?: Record<string, string>;
}

export interface Ref {
  id: string;
  name: string;
}

export interface RunSummary {
  id: string;
  status: RunStatus;
  outcome: EndingOutcome | null;
  flow: Ref;
  flowVersion: number;
  linkToken: string;
  currentStage: Ref | null;
  endingId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationStep {
  stepId: string;
  status: StepStatus;
  submittedAt: string | null;
  values: StepValues;
}

export interface Decision {
  kind: "approved" | "rejected" | "returned";
  comment: string | null;
  at: string;
}

// ---------- admin: flows ----------

export interface FlowVersionSummary {
  id: string;
  version: number;
  publishedAt: string;
  isActive: boolean;
  runCount: number;
}

export interface FlowSummary {
  id: string;
  key: string;
  name: string;
  activeVersion: number | null;
  hasUnpublishedChanges: boolean;
  runCount: number;
  updatedAt: string;
}

export interface FlowDetail extends FlowSummary {
  draft: FlowDefinition;
  versions: FlowVersionSummary[];
}

export interface FlowVersion extends FlowVersionSummary {
  flowId: string;
  definition: FlowDefinition;
}

export const CreateFlowBody = z.object({
  name: z.string().trim().min(1).max(120),
  key: z.string().regex(/^[a-z][a-z0-9-]*$/, "Use lowercase letters, digits and dashes"),
});
export type CreateFlowBody = z.infer<typeof CreateFlowBody>;

export const SaveDraftBody = z.object({ definition: FlowDefinition });
export type SaveDraftBody = z.infer<typeof SaveDraftBody>;

export interface ValidationResult {
  issues: PublishIssue[];
}

// ---------- admin: applications ----------

export interface ApplicationListItem {
  id: string;
  status: ApplicationStatus;
  company: Ref;
  flow: Ref;
  flowVersion: number;
  stage: Ref;
  run: { id: string; status: RunStatus };
  submittedAt: string | null;
  updatedAt: string;
}

export interface ApplicationDetail {
  id: string;
  status: ApplicationStatus;
  company: Ref;
  run: RunSummary;
  /** Stage definition from the version the run is pinned to. */
  stage: Stage;
  steps: ApplicationStep[];
  decision: Decision | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  timeline: TimelineEvent[];
}

export const DecisionBody = z.object({ comment: z.string().trim().max(2000).optional() });
export type DecisionBody = z.infer<typeof DecisionBody>;
export const ReturnBody = z.object({ comment: z.string().trim().min(1).max(2000) });
export type ReturnBody = z.infer<typeof ReturnBody>;

// ---------- admin: companies ----------

export interface CompanySummary {
  id: string;
  name: string;
  createdAt: string;
  latestRun: RunSummary | null;
}

export interface StoredFile extends FileRef {
  runId: string | null;
  fieldKey: string | null;
  createdAt: string;
}

export interface CompanyDetail {
  id: string;
  name: string;
  createdAt: string;
  attributes: Record<string, FieldValue>;
  runs: RunSummary[];
  files: StoredFile[];
  timeline: TimelineEvent[];
}

export const CreateCompanyBody = z.object({
  name: z.string().trim().min(1).max(200),
  flowId: z.string().uuid(),
});
export type CreateCompanyBody = z.infer<typeof CreateCompanyBody>;

export const StartRunBody = z.object({ flowId: z.string().uuid() });
export type StartRunBody = z.infer<typeof StartRunBody>;

// ---------- applicant ----------

export interface ApplicantApplication {
  id: string;
  stageId: string;
  status: ApplicationStatus;
  decision: Decision | null;
  steps: ApplicationStep[];
}

export interface ApplicantRunView {
  run: { id: string; status: RunStatus; outcome: EndingOutcome | null; linkToken: string };
  company: Ref;
  flow: { id: string; name: string; version: number };
  /** Definition of the version the run is pinned to. */
  definition: FlowDefinition;
  applications: ApplicantApplication[];
  currentApplicationId: string | null;
  ending: Ending | null;
}

export const SubmitStepBody = z.object({ values: StepValues });
export type SubmitStepBody = z.infer<typeof SubmitStepBody>;
