import type { ApplicantApplication, ApplicantRunView, ApplicationStatus, Stage, StepStatus } from "@comfi/kyb-contracts";

/** An application together with the stage definition it belongs to. */
export interface StageEntry {
  application: ApplicantApplication;
  stage: Stage;
}

export const stageEntries = ({ applications, definition }: ApplicantRunView): StageEntry[] =>
  applications.flatMap((application) => {
    const stage = definition.stages.find((candidate) => candidate.id === application.stageId);
    return stage ? [{ application, stage }] : [];
  });

export const currentEntry = (view: ApplicantRunView) =>
  stageEntries(view).find((entry) => entry.application.id === view.currentApplicationId);

export const isEditable = (status: ApplicationStatus) => status === "in_progress" || status === "returned";

export const stageStatusLabel: Record<ApplicationStatus, string> = {
  in_progress: "In progress",
  in_review: "In review",
  returned: "Changes requested",
  approved: "Completed",
  rejected: "Not approved",
};

export const stepStatus = (application: ApplicantApplication, stepId: string): StepStatus =>
  application.steps.find((step) => step.stepId === stepId)?.status ?? "pending";

export const submittedValues = (application: ApplicantApplication, stepId: string) =>
  application.steps.find((step) => step.stepId === stepId)?.values ?? {};

const firstPendingIndex = ({ application, stage }: StageEntry) =>
  stage.steps.findIndex((step) => stepStatus(application, step.id) === "pending");

/** Number of steps other than `stepId` that still need answers. */
export const otherPendingSteps = ({ application, stage }: StageEntry, stepId: string) =>
  stage.steps.filter((step) => step.id !== stepId && stepStatus(application, step.id) === "pending").length;

/** Returned applications start over from the top; otherwise pick up where the applicant left off. */
export function initialStepIndex(entry: StageEntry): number {
  if (entry.application.status === "returned") return 0;
  const pending = firstPendingIndex(entry);
  return pending === -1 ? Math.max(entry.stage.steps.length - 1, 0) : pending;
}

export function nextStepIndex(entry: StageEntry, from: number): number {
  if (from < entry.stage.steps.length - 1) return from + 1;
  const pending = firstPendingIndex(entry);
  return pending === -1 ? from : pending;
}
