import { Alert, Card, Loading, Page, PageHeader, Timeline, formatDateTime } from "@comfi/ui";
import { Link, useParams } from "react-router";
import { DocumentsCard } from "../components/DocumentsCard";
import { ProfileCard } from "../components/ProfileCard";
import { RunsCard } from "../components/RunsCard";
import { useCompany } from "../queries";

export function CompanyDetailPage() {
  const { companyId = "" } = useParams();
  const { data: company, error, isPending } = useCompany(companyId);

  return (
    <Page>
      <nav className="cf-breadcrumb" aria-label="Breadcrumb">
        <Link to="..">Companies</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{company?.name ?? "Company"}</span>
      </nav>
      {isPending ? (
        <Loading label="Loading company…" />
      ) : error ? (
        <Alert tone="danger" title="Couldn't load this company">
          {error.message}
        </Alert>
      ) : (
        <>
          <PageHeader title={company.name} subtitle={`Created ${formatDateTime(company.createdAt)}`} />
          <div className="cf-detail-grid">
            <div className="cf-detail-grid__main">
              <RunsCard company={company} />
              <ProfileCard attributes={company.attributes} />
              <DocumentsCard files={company.files} />
            </div>
            <div className="cf-detail-grid__side">
              <Card title="Activity">
                <Timeline events={company.timeline} />
              </Card>
            </div>
          </div>
        </>
      )}
    </Page>
  );
}
