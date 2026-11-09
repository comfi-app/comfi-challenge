import type { ApplicationStatus, Decision } from "@comfi/kyb-contracts";
import { Alert, formatDateTime } from "@comfi/ui";
import type { ComponentProps } from "react";

const copy: Record<Decision["kind"] | "resubmitted", { title: string; tone: ComponentProps<typeof Alert>["tone"] }> = {
  approved: { title: "Approved", tone: "success" },
  returned: { title: "Returned to applicant", tone: "warning" },
  rejected: { title: "Rejected", tone: "danger" },
  resubmitted: { title: "Previously returned to applicant", tone: "info" },
};

export function DecisionAlert({ decision, status }: { decision: Decision; status: ApplicationStatus }) {
  // A returned application keeps its decision after the applicant resubmits it.
  const resubmitted = decision.kind === "returned" && status !== "returned";
  const { title, tone } = copy[resubmitted ? "resubmitted" : decision.kind];
  return (
    <Alert tone={tone} title={`${title} · ${formatDateTime(decision.at)}`}>
      {decision.comment ? <p className="apps-decision-comment">{decision.comment}</p> : <span className="apps-faint">No comment</span>}
    </Alert>
  );
}
