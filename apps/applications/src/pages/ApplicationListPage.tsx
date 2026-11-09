import { Alert, Card, Loading, Page, PageHeader, Tabs, applicationStatusLabel } from "@comfi/ui";
import { useSearchParams } from "react-router";
import { ApplicationsEmpty } from "../components/ApplicationsEmpty";
import { ApplicationsTable } from "../components/ApplicationsTable";
import { useApplicationList } from "../queries";
import { matchesFilter, statusFilters } from "../status-filters";

export function ApplicationListPage() {
  const [params, setParams] = useSearchParams();
  const filter = statusFilters.find((candidate) => candidate === params.get("status")) ?? "in_review";
  const { data: applications, error, isPending } = useApplicationList();

  const tabs = statusFilters.map((value) => ({
    value,
    label: (
      <span className="apps-tab">
        {value === "all" ? "All" : applicationStatusLabel(value)}
        <span className="apps-tab__count">
          {applications ? applications.filter((application) => matchesFilter(value, application)).length : "·"}
        </span>
      </span>
    ),
  }));
  const visible = applications?.filter((application) => matchesFilter(filter, application)) ?? [];

  return (
    <Page>
      <PageHeader title="Applications" subtitle="Review what companies submit during onboarding." />
      <div className="apps-toolbar">
        <Tabs items={tabs} value={filter} onChange={(status) => setParams({ status }, { replace: true })} />
      </div>
      {error ? (
        <Alert tone="danger" title="Couldn't load applications">
          {error.message}
        </Alert>
      ) : (
        <Card bodyClassName="cf-card__body--flush">
          {isPending ? (
            <Loading label="Loading applications…" />
          ) : visible.length === 0 ? (
            <ApplicationsEmpty filter={filter} />
          ) : (
            <ApplicationsTable applications={visible} />
          )}
        </Card>
      )}
    </Page>
  );
}
