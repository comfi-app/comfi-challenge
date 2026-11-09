import type { ApplicationListItem } from "@comfi/kyb-contracts";
import { ApplicationStatusBadge, formatDateTime, timeAgo } from "@comfi/ui";
import { Link, useNavigate } from "react-router";

export function ApplicationsTable({ applications }: { applications: readonly ApplicationListItem[] }) {
  const navigate = useNavigate();
  return (
    <div className="cf-table-wrap">
      <table className="cf-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Stage</th>
            <th>Flow</th>
            <th>Status</th>
            <th>Submitted</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => (
            <tr key={application.id} data-clickable="true" onClick={() => navigate(application.id)}>
              <td>
                <Link to={application.id} className="apps-row-link" onClick={(event) => event.stopPropagation()}>
                  {application.company.name}
                </Link>
              </td>
              <td>{application.stage.name}</td>
              <td className="apps-nowrap">
                {application.flow.name} <span className="cf-muted">v{application.flowVersion}</span>
              </td>
              <td>
                <ApplicationStatusBadge status={application.status} />
              </td>
              <td className="apps-nowrap">
                {application.submittedAt ? <RelativeTime iso={application.submittedAt} /> : <span className="cf-muted">—</span>}
              </td>
              <td className="apps-nowrap">
                <RelativeTime iso={application.updatedAt} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RelativeTime({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} title={formatDateTime(iso)}>
      {timeAgo(iso)}
    </time>
  );
}
