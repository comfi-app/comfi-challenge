import type { CompanySummary } from "@comfi/kyb-contracts";
import { RunStateBadge, formatDate } from "@comfi/ui";
import { Link, useNavigate } from "react-router";

export function CompaniesTable({ companies }: { companies: readonly CompanySummary[] }) {
  const navigate = useNavigate();
  return (
    <div className="cf-table-wrap">
      <table className="cf-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Onboarding</th>
            <th>Status</th>
            <th>Current stage</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {companies.map(({ id, name, createdAt, latestRun: run }) => (
            <tr key={id} data-clickable="true" onClick={() => navigate(id)}>
              <td>
                <Link to={id} className="co-row-link" onClick={(event) => event.stopPropagation()}>
                  {name}
                </Link>
              </td>
              <td className="co-nowrap">
                {run ? (
                  <>
                    {run.flow.name} <span className="cf-muted">v{run.flowVersion}</span>
                  </>
                ) : (
                  <span className="cf-muted">Not started</span>
                )}
              </td>
              <td>{run ? <RunStateBadge status={run.status} outcome={run.outcome} /> : <span className="cf-muted">—</span>}</td>
              <td>{run?.status !== "completed" && run?.currentStage ? run.currentStage.name : <span className="cf-muted">—</span>}</td>
              <td className="co-nowrap">{formatDate(createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
