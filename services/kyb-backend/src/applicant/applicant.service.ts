import { Injectable, NotFoundException } from "@nestjs/common";
import type { ApplicantRunView, EndingOutcome, FileRef, FlowDefinition, RunStatus, StepValues } from "@comfi/kyb-contracts";
import { toApplicationSteps, toDecision, type ApplicationRow, type ApplicationStepRow } from "../applications/application-mappers";
import { Database } from "../db/database";
import { EngineService, type UploadInput } from "../engine/engine.service";

interface RunViewRow {
  id: string;
  status: RunStatus;
  outcome: EndingOutcome | null;
  ending_id: string | null;
  link_token: string;
  company_id: string;
  company_name: string;
  flow_id: string;
  flow_name: string;
  flow_version: number;
  definition: FlowDefinition;
}

/** Everything the applicant link exposes. The link token is the only credential. */
@Injectable()
export class ApplicantService {
  constructor(
    private readonly db: Database,
    private readonly engine: EngineService,
  ) {}

  async view(token: string): Promise<ApplicantRunView> {
    const { rows } = await this.db.query<RunViewRow>(
      `select r.id, r.status, r.outcome, r.ending_id, r.link_token,
              c.id as company_id, c.name as company_name,
              f.id as flow_id, f.name as flow_name, v.version as flow_version, v.definition
       from flow_runs r
       join companies c on c.id = r.company_id
       join flows f on f.id = r.flow_id
       join flow_versions v on v.id = r.flow_version_id
       where r.link_token = $1`,
      [token],
    );
    const run = rows[0];
    if (!run) throw new NotFoundException("Run not found");

    const [applications, steps] = await Promise.all([
      this.db.query<ApplicationRow>("select * from applications where run_id = $1 order by created_at", [run.id]),
      this.db.query<ApplicationStepRow>(
        `select s.* from application_steps s join applications a on a.id = s.application_id where a.run_id = $1`,
        [run.id],
      ),
    ]);
    const { definition } = run;

    return {
      run: { id: run.id, status: run.status, outcome: run.outcome, linkToken: run.link_token },
      company: { id: run.company_id, name: run.company_name },
      flow: { id: run.flow_id, name: run.flow_name, version: run.flow_version },
      definition,
      applications: applications.rows.map((application) => {
        const stage = definition.stages.find((candidate) => candidate.id === application.stage_id);
        const stageSteps = steps.rows.filter((step) => step.application_id === application.id);
        return {
          id: application.id,
          stageId: application.stage_id,
          status: application.status,
          decision: toDecision(application),
          steps: stage ? toApplicationSteps(stage, stageSteps) : [],
        };
      }),
      currentApplicationId: run.status === "active" ? (applications.rows.at(-1)?.id ?? null) : null,
      ending: definition.endings.find((ending) => ending.id === run.ending_id) ?? null,
    };
  }

  async upload(token: string, file: UploadInput): Promise<FileRef> {
    return this.db.transaction((tx) => this.engine.upload(tx, token, file));
  }

  async submitStep(token: string, applicationId: string, stepId: string, values: StepValues): Promise<ApplicantRunView> {
    await this.db.transaction((tx) => this.engine.submitStep(tx, token, applicationId, stepId, values));
    return this.view(token);
  }
}
