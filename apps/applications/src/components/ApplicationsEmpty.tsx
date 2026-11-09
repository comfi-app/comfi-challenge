import { EmptyState } from "@comfi/ui";
import { Link } from "react-router";
import type { StatusFilter } from "../status-filters";

const copy: Record<StatusFilter, { title: string; body: string }> = {
  in_review: { title: "Nothing to review", body: "Applications waiting for a decision will show up here." },
  in_progress: { title: "No applications in progress", body: "Companies still filling in their onboarding appear here." },
  returned: { title: "No returned applications", body: "Applications sent back for changes appear here until they're resubmitted." },
  approved: { title: "No approved applications", body: "Applications you approve will be listed here." },
  rejected: { title: "No rejected applications", body: "Applications you reject will be listed here." },
  all: { title: "No applications yet", body: "An application is created as soon as a company starts onboarding." },
};

export function ApplicationsEmpty({ filter }: { filter: StatusFilter }) {
  const { title, body } = copy[filter];
  return (
    <EmptyState title={title}>
      <p className="apps-empty-body">{body}</p>
      {filter === "all" && <Link to="/companies">Go to companies</Link>}
    </EmptyState>
  );
}
