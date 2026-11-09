import type { ApplicationDetail } from "@comfi/kyb-contracts";
import { Alert, ApplicationStatusBadge, Card, Loading, Page, PageHeader, Timeline, formatDateTime } from "@comfi/ui";
import { Link, useParams } from "react-router";
import { DecisionActions } from "../components/DecisionActions";
import { DecisionAlert } from "../components/DecisionAlert";
import { RunCard } from "../components/RunCard";
import { StepCard } from "../components/StepCard";
import { useApplication, useDecideApplication } from "../queries";

export function ApplicationDetailPage() {
  const { applicationId = "" } = useParams();
  const { data: application, error, isPending } = useApplication(applicationId);

  return (
    <Page>
      <nav className="cf-breadcrumb" aria-label="Breadcrumb">
        <Link to="..">Applications</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{application?.company.name ?? "Application"}</span>
      </nav>
      {isPending ? (
        <Loading label="Loading application…" />
      ) : error ? (
        <Alert tone="danger" title="Couldn't load this application">
          {error.message}
        </Alert>
      ) : (
        <ApplicationView application={application} />
      )}
    </Page>
  );
}

function ApplicationView({ application }: { application: ApplicationDetail }) {
  const decide = useDecideApplication(application.id);
  const { stage, run } = application;

  return (
    <>
      <PageHeader
        title={
          <Link to={`/companies/${application.company.id}`} className="apps-title-link">
            {application.company.name}
          </Link>
        }
        subtitle={
          <span className="cf-meta">
            <ApplicationStatusBadge status={application.status} />
            <span>{stage.name} stage</span>
            <span>
              {run.flow.name} v{run.flowVersion}
            </span>
            {application.submittedAt && <span>Submitted {formatDateTime(application.submittedAt)}</span>}
          </span>
        }
        actions={application.status === "in_review" && <DecisionActions decide={decide} />}
      />
      {decide.error && (
        <Alert tone="danger" title="Decision failed">
          {decide.error.message}
        </Alert>
      )}
      {application.decision && <DecisionAlert decision={application.decision} status={application.status} />}
      <div className="cf-detail-grid">
        <div className="cf-detail-grid__main">
          {stage.steps.map((step) => (
            <StepCard key={step.id} step={step} state={application.steps.find((candidate) => candidate.stepId === step.id)} />
          ))}
        </div>
        <div className="cf-detail-grid__side">
          <RunCard run={run} />
          <Card title="Timeline">
            <Timeline events={application.timeline} />
          </Card>
        </div>
      </div>
    </>
  );
}
