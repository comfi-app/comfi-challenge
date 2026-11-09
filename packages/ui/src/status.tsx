import type { ApplicationStatus, RunStatus } from "@comfi/kyb-contracts";
import { Badge, type Tone } from "./components";

const applicationStatus: Record<ApplicationStatus, { label: string; tone: Tone }> = {
  in_progress: { label: "In progress", tone: "info" },
  in_review: { label: "In review", tone: "warning" },
  returned: { label: "Returned", tone: "accent" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

const runStatus: Record<RunStatus, { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "info" },
  completed: { label: "Completed", tone: "neutral" },
  blocked: { label: "Blocked", tone: "danger" },
};

export const applicationStatusLabel = (status: ApplicationStatus) => applicationStatus[status].label;

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const s = applicationStatus[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const s = runStatus[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
