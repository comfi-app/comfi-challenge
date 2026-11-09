import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { CompanyDetail, CompanySummary, FieldValue, RunSummary, StoredFile } from "@comfi/kyb-contracts";
import { Database } from "../db/database";
import { EngineService } from "../engine/engine.service";
import { EventsService } from "../events/events.service";
import { RunsService } from "../runs/runs.service";

interface CompanyRow {
  id: string;
  name: string;
  attributes: Record<string, FieldValue>;
  created_at: Date;
}

interface FileRow {
  id: string;
  run_id: string | null;
  field_key: string | null;
  file_name: string;
  mime_type: string;
  size: number;
  created_at: Date;
}

@Injectable()
export class CompaniesService {
  constructor(
    private readonly db: Database,
    private readonly engine: EngineService,
    private readonly events: EventsService,
    private readonly runs: RunsService,
  ) {}

  async list(): Promise<CompanySummary[]> {
    const [companies, latestRuns] = await Promise.all([
      this.db.query<CompanyRow>("select * from companies order by created_at desc"),
      this.runs.latestByCompany(),
    ]);
    return companies.rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at.toISOString(),
      latestRun: latestRuns.get(row.id) ?? null,
    }));
  }

  async get(companyId: string): Promise<CompanyDetail> {
    const { rows } = await this.db.query<CompanyRow>("select * from companies where id = $1", [companyId]);
    const company = rows[0];
    if (!company) throw new NotFoundException("Company not found");
    const [runs, files, timeline] = await Promise.all([
      this.runs.forCompany(companyId),
      this.db.query<FileRow>(
        `select id, run_id, field_key, file_name, mime_type, size, created_at
         from files where company_id = $1 order by created_at desc`,
        [companyId],
      ),
      this.events.forCompany(companyId),
    ]);
    return {
      id: company.id,
      name: company.name,
      createdAt: company.created_at.toISOString(),
      attributes: company.attributes,
      runs,
      files: files.rows.map(
        (file): StoredFile => ({
          fileId: file.id,
          fileName: file.file_name,
          mimeType: file.mime_type,
          size: file.size,
          runId: file.run_id,
          fieldKey: file.field_key,
          createdAt: file.created_at.toISOString(),
        }),
      ),
      timeline,
    };
  }

  /** Creates the company and starts its first run in one transaction. */
  async create(name: string, flowId: string): Promise<CompanyDetail> {
    const companyId = await this.db.transaction(async (tx) => {
      const { rows } = await tx.query<{ id: string }>("insert into companies (name) values ($1) returning id", [name]);
      const id = rows[0]!.id;
      await this.engine.startRun(tx, id, flowId);
      return id;
    });
    return this.get(companyId);
  }

  async startRun(companyId: string, flowId: string): Promise<RunSummary> {
    const runId = await this.db.transaction(async (tx) => {
      const { rows } = await tx.query<{ active_runs: number }>(
        `select (select count(*)::int from flow_runs where company_id = c.id and status = 'active') as active_runs
         from companies c where c.id = $1 for update`,
        [companyId],
      );
      const company = rows[0];
      if (!company) throw new NotFoundException("Company not found");
      if (company.active_runs > 0) throw new ConflictException("Company already has an active run");
      return this.engine.startRun(tx, companyId, flowId);
    });
    return (await this.runs.get(runId))!;
  }
}
