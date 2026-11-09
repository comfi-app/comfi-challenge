import type { FlowSummary } from "@comfi/kyb-contracts";
import { Alert, Button, Card, EmptyState, Loading, Page, PageHeader, timeAgo } from "@comfi/ui";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useFlowsQuery } from "../api";
import { FlowStatusBadges } from "../editor/FlowStatusBadges";
import { errorMessage } from "../format";
import { Icon } from "../icons";
import { NewFlowDialog } from "./NewFlowDialog";

export function FlowsPage() {
  const flows = useFlowsQuery();
  const [isCreating, setCreating] = useState(false);

  return (
    <Page>
      <PageHeader
        title="Flow constructor"
        subtitle="Design the onboarding journeys applicants go through, then publish them as versions."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={14} /> New flow
          </Button>
        }
      />
      {flows.isPending ? (
        <Loading label="Loading flows…" />
      ) : flows.isError ? (
        <Alert tone="danger" title="Couldn't load flows">
          {errorMessage(flows.error)}
        </Alert>
      ) : flows.data.length === 0 ? (
        <Card>
          <EmptyState title="No flows yet">Create a flow to start designing onboarding.</EmptyState>
        </Card>
      ) : (
        <FlowsTable flows={flows.data} />
      )}
      {isCreating && <NewFlowDialog onClose={() => setCreating(false)} />}
    </Page>
  );
}

function FlowsTable({ flows }: { flows: readonly FlowSummary[] }) {
  const navigate = useNavigate();
  return (
    <Card bodyClassName="fc-flush">
      <div className="cf-table-wrap">
        <table className="cf-table">
          <thead>
            <tr>
              <th>Flow</th>
              <th>Status</th>
              <th className="fc-num">Runs</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {flows.map((flow) => (
              <tr key={flow.id} data-clickable="true" onClick={() => void navigate(flow.id)}>
                <td>
                  <Link to={flow.id} className="fc-flow-link" onClick={(event) => event.stopPropagation()}>
                    {flow.name}
                  </Link>
                  <code className="fc-key">{flow.key}</code>
                </td>
                <td>
                  <div className="cf-row">
                    <FlowStatusBadges flow={flow} />
                  </div>
                </td>
                <td className="fc-num">{flow.runCount}</td>
                <td className="fc-muted">{timeAgo(flow.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
