import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  ApplicationDetail,
  ApplicationListItem,
  ApplicationStatus,
  FlowDefinition,
  RunStatus,
} from "@comfi/kyb-contracts";
import { Database } from "../db/database";
import { EngineService, type DecisionInput } from "../engine/engine.service";
import { EventsService } from "../events/events.service";
import { RunsService } from "../runs/runs.service";
import { toApplicationSteps, toDecision, type ApplicationRow, type ApplicationStepRow } from "./application-mappers";

interface ListRow {
  id: string;
  status: ApplicationStatus;
  company_id: string;
  company_name: string;
  flow_id: string;
  flow_name: string;
  flow_version: number;
  stage_id: string;
  stage_name: string | null;
  run_id: string;
  run_status: RunStatus;
  submitted_at: Date | null;
  updated_at: Date;
}

interface DetailRow extends ApplicationRow {
  company_id: string;
  company_name: string;
  definition: FlowDefinition;
}

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly db: Database,
    private readonly engine: EngineService,
    private readonly events: EventsService,
    private readonly runs: RunsService,
  ) {}

  async list(status?: ApplicationStatus): Promise<ApplicationListItem[]> {
    const { rows } = await this.db.query<ListRow>(
      `select a.id, a.status, a.stage_id, a.submitted_at, a.updated_at,
              c.id as company_id, c.name as company_name,
              f.id as flow_id, f.name as flow_name, v.version as flow_version,
              r.id as run_id, r.status as run_status,
              (select s ->> 'name' from jsonb_array_elements(v.definition -> 'stages') s
               where s ->> 'id' = a.stage_id) as stage_name
       from applications a
       join flow_runs r on r.id = a.run_id
       join companies c on c.id = r.company_id
       join flows f on f.id = r.flow_id
       join flow_versions v on v.id = r.flow_version_id
       where $1::text is null or a.status = $1
       order by a.updated_at desc, a.created_at desc`,
      [status ?? null],
    );
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      company: { id: row.company_id, name: row.company_name },
      flow: { id: row.flow_id, name: row.flow_name },
      flowVersion: row.flow_version,
      stage: { id: row.stage_id, name: row.stage_name ?? row.stage_id },
      run: { id: row.run_id, status: row.run_status },
      submittedAt: row.submitted_at?.toISOString() ?? null,
      updatedAt: row.updated_at.toISOString(),
    }));
  }

  async get(applicationId: string): Promise<ApplicationDetail> {
    const { rows } = await this.db.query<DetailRow>(
      `select a.*, c.id as company_id, c.name as company_name, v.definition
       from applications a
       join flow_runs r on r.id = a.run_id
       join companies c on c.id = r.company_id
       join flow_versions v on v.id = r.flow_version_id
       where a.id = $1`,
      [applicationId],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException("Application not found");
    const stage = row.definition.stages.find((candidate) => candidate.id === row.stage_id);
    if (!stage) throw new Error(`Stage ${row.stage_id} is missing from the pinned definition`);

    const [run, steps, timeline] = await Promise.all([
      this.runs.get(row.run_id),
      this.db.query<ApplicationStepRow>("select * from application_steps where application_id = $1", [row.id]),
      this.events.forRun(row.run_id),
    ]);
    return {
      id: row.id,
      status: row.status,
      company: { id: row.company_id, name: row.company_name },
      run: run!,
      stage,
      steps: toApplicationSteps(stage, steps.rows),
      decision: toDecision(row),
      submittedAt: row.submitted_at?.toISOString() ?? null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      timeline,
    };
  }

  async decide(applicationId: string, decision: DecisionInput): Promise<ApplicationDetail> {
    await this.db.transaction((tx) => this.engine.decide(tx, applicationId, decision));
    return this.get(applicationId);
  }
}
