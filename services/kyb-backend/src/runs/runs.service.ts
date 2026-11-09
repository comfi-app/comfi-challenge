import { Injectable } from "@nestjs/common";
import type { EndingOutcome, RunStatus, RunSummary } from "@comfi/kyb-contracts";
import { Database } from "../db/database";

interface RunSummaryRow {
  id: string;
  company_id: string;
  status: RunStatus;
  outcome: EndingOutcome | null;
  flow_id: string;
  flow_name: string;
  flow_version: number;
  link_token: string;
  stage_id: string | null;
  stage_name: string | null;
  ending_id: string | null;
  created_at: Date;
  updated_at: Date;
}

// The current stage is the stage of the run's latest application; its name comes from the pinned definition.
const runSummarySql = `
  select r.id, r.company_id, r.status, r.outcome, r.flow_id, f.name as flow_name, v.version as flow_version,
         r.link_token, r.ending_id, r.created_at, r.updated_at, latest.stage_id,
         (select s ->> 'name' from jsonb_array_elements(v.definition -> 'stages') s
          where s ->> 'id' = latest.stage_id) as stage_name
  from flow_runs r
  join flows f on f.id = r.flow_id
  join flow_versions v on v.id = r.flow_version_id
  left join lateral (
    select a.stage_id from applications a where a.run_id = r.id order by a.created_at desc limit 1
  ) latest on true`;

const toRunSummary = (row: RunSummaryRow): RunSummary => ({
  id: row.id,
  status: row.status,
  outcome: row.outcome,
  flow: { id: row.flow_id, name: row.flow_name },
  flowVersion: row.flow_version,
  linkToken: row.link_token,
  currentStage:
    row.status === "active" && row.stage_id ? { id: row.stage_id, name: row.stage_name ?? row.stage_id } : null,
  endingId: row.ending_id,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

@Injectable()
export class RunsService {
  constructor(private readonly db: Database) {}

  async get(runId: string): Promise<RunSummary | undefined> {
    const { rows } = await this.db.query<RunSummaryRow>(`${runSummarySql} where r.id = $1`, [runId]);
    return rows[0] && toRunSummary(rows[0]);
  }

  async forCompany(companyId: string): Promise<RunSummary[]> {
    const { rows } = await this.db.query<RunSummaryRow>(
      `${runSummarySql} where r.company_id = $1 order by r.created_at desc`,
      [companyId],
    );
    return rows.map(toRunSummary);
  }

  /** Latest run of each company, keyed by company id. */
  async latestByCompany(): Promise<Map<string, RunSummary>> {
    const { rows } = await this.db.query<RunSummaryRow>(
      `select distinct on (company_id) * from (${runSummarySql}) runs order by company_id, created_at desc`,
    );
    return new Map(rows.map((row) => [row.company_id, toRunSummary(row)]));
  }
}
