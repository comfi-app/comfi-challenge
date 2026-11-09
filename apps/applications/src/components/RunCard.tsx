import type { RunSummary } from "@comfi/kyb-contracts";
import { Card, CopyableLink, RunStateBadge, formatDateTime, useAdminApp } from "@comfi/ui";

export function RunCard({ run }: { run: RunSummary }) {
  const { onboardingUrl } = useAdminApp();
  return (
    <Card title="Onboarding run">
      <div className="cf-stack">
        <dl className="cf-dl cf-dl--compact">
          <dt>Flow</dt>
          <dd>{run.flow.name}</dd>
          <dt>Version</dt>
          <dd>v{run.flowVersion}</dd>
          <dt>Status</dt>
          <dd>
            <RunStateBadge status={run.status} outcome={run.outcome} />
          </dd>
          <dt>Current stage</dt>
          <dd>{run.currentStage?.name ?? "—"}</dd>
          <dt>Started</dt>
          <dd>{formatDateTime(run.createdAt)}</dd>
        </dl>
        <div className="cf-subhead">Applicant link</div>
        <CopyableLink url={onboardingUrl(run.linkToken)} />
      </div>
    </Card>
  );
}
