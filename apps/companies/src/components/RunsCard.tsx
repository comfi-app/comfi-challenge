import type { ApplicationListItem, CompanyDetail, RunSummary } from "@comfi/kyb-contracts";
import {
  ApplicationStatusBadge,
  Button,
  Card,
  CopyableLink,
  EmptyState,
  RunStateBadge,
  formatDateTime,
  timeAgo,
  useAdminApp,
} from "@comfi/ui";
import { useState } from "react";
import { Link } from "react-router";
import { useApplicationList } from "../queries";
import { StartRunDialog } from "./StartRunDialog";

export function RunsCard({ company }: { company: CompanyDetail }) {
  const [starting, setStarting] = useState(false);
  const { data: applications } = useApplicationList();
  const hasActiveRun = company.runs.some((run) => run.status === "active");

  return (
    <Card
      title="Onboarding runs"
      actions={
        !hasActiveRun && (
          <Button size="sm" onClick={() => setStarting(true)}>
            Start new run
          </Button>
        )
      }
      bodyClassName="cf-card__body--flush"
    >
      {company.runs.length === 0 ? (
        <EmptyState title="No onboarding yet">Start a run to send the applicant an onboarding link.</EmptyState>
      ) : (
        <ul className="co-runs">
          {company.runs.map((run) => (
            // The list is ordered by most recent update, so the first match is the latest application.
            <RunItem key={run.id} run={run} application={applications?.find((item) => item.run.id === run.id)} />
          ))}
        </ul>
      )}
      {starting && <StartRunDialog companyId={company.id} onClose={() => setStarting(false)} />}
    </Card>
  );
}

function RunItem({ run, application }: { run: RunSummary; application: ApplicationListItem | undefined }) {
  const { onboardingUrl } = useAdminApp();
  return (
    <li className="co-run">
      <div className="co-run__head">
        <span className="co-run__title">
          {run.flow.name} <span className="cf-muted">v{run.flowVersion}</span>
        </span>
        <RunStateBadge status={run.status} outcome={run.outcome} />
      </div>
      <dl className="cf-dl cf-dl--compact">
        <dt>Current stage</dt>
        <dd>{run.status === "completed" ? <span className="cf-muted">Finished</span> : (run.currentStage?.name ?? "—")}</dd>
        <dt>Started</dt>
        <dd>{formatDateTime(run.createdAt)}</dd>
        <dt>Updated</dt>
        <dd title={formatDateTime(run.updatedAt)}>{timeAgo(run.updatedAt)}</dd>
        <dt>Application</dt>
        <dd>
          {application ? (
            <Link to={`/applications/${application.id}`} className="co-application-link">
              {application.stage.name}
              <ApplicationStatusBadge status={application.status} />
              <span aria-hidden>→</span>
            </Link>
          ) : (
            <span className="cf-muted">—</span>
          )}
        </dd>
        <dt>Applicant link</dt>
        <dd>
          <CopyableLink url={onboardingUrl(run.linkToken)} />
        </dd>
      </dl>
    </li>
  );
}
