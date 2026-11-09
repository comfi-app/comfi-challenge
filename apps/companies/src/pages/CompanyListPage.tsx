import { Alert, Button, Card, EmptyState, Loading, Page, PageHeader } from "@comfi/ui";
import { useState } from "react";
import { CompaniesTable } from "../components/CompaniesTable";
import { NewCompanyDialog } from "../components/NewCompanyDialog";
import { useCompanyList } from "../queries";

export function CompanyListPage() {
  const { data: companies, error, isPending } = useCompanyList();
  const [creating, setCreating] = useState(false);

  return (
    <Page>
      <PageHeader
        title="Companies"
        subtitle={companies ? `${companies.length} ${companies.length === 1 ? "company" : "companies"} onboarding with Comfi` : " "}
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            New company
          </Button>
        }
      />
      {error ? (
        <Alert tone="danger" title="Couldn't load companies">
          {error.message}
        </Alert>
      ) : (
        <Card bodyClassName="cf-card__body--flush">
          {isPending ? (
            <Loading label="Loading companies…" />
          ) : companies.length === 0 ? (
            <EmptyState title="No companies yet">
              <p className="co-flat">Create a company to send its applicant an onboarding link.</p>
              <Button className="co-empty-action" onClick={() => setCreating(true)}>
                New company
              </Button>
            </EmptyState>
          ) : (
            <CompaniesTable companies={companies} />
          )}
        </Card>
      )}
      {creating && <NewCompanyDialog onClose={() => setCreating(false)} />}
    </Page>
  );
}
