import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateFlowBody,
  FlowDefinition,
  FlowDetail,
  FlowSummary,
  FlowVersion,
  FlowVersionSummary,
  ValidationResult,
} from "@comfi/kyb-contracts";
import { DatabaseError } from "pg";
import { ApiException } from "../common/api-exception";
import { Database } from "../db/database";
import { validateFlow } from "./flow-validation";
import { starterDefinition } from "./starter-definition";

interface FlowSummaryRow {
  id: string;
  key: string;
  name: string;
  active_version: number | null;
  has_unpublished_changes: boolean;
  run_count: number;
  updated_at: Date;
}

interface FlowVersionRow {
  id: string;
  flow_id: string;
  version: number;
  definition: FlowDefinition;
  published_at: Date;
  is_active: boolean;
  run_count: number;
}

// jsonb equality ignores key order and whitespace, so this compares the definitions canonically.
const flowSummarySql = `
  select f.id, f.key, f.name, f.updated_at, active.version as active_version,
         active.definition is distinct from f.draft as has_unpublished_changes,
         (select count(*)::int from flow_runs r where r.flow_id = f.id) as run_count
  from flows f
  left join flow_versions active on active.flow_id = f.id and active.is_active`;

const flowVersionSql = `
  select v.*, (select count(*)::int from flow_runs r where r.flow_version_id = v.id) as run_count
  from flow_versions v`;

const uniqueViolation = "23505";

const toSummary = (row: FlowSummaryRow): FlowSummary => ({
  id: row.id,
  key: row.key,
  name: row.name,
  activeVersion: row.active_version,
  hasUnpublishedChanges: row.has_unpublished_changes,
  runCount: row.run_count,
  updatedAt: row.updated_at.toISOString(),
});

const toVersionSummary = (row: FlowVersionRow): FlowVersionSummary => ({
  id: row.id,
  version: row.version,
  publishedAt: row.published_at.toISOString(),
  isActive: row.is_active,
  runCount: row.run_count,
});

@Injectable()
export class FlowsService {
  constructor(private readonly db: Database) {}

  async list(): Promise<FlowSummary[]> {
    const { rows } = await this.db.query<FlowSummaryRow>(`${flowSummarySql} order by f.name`);
    return rows.map(toSummary);
  }

  async get(flowId: string): Promise<FlowDetail> {
    const [summary, draft, versions] = await Promise.all([
      this.db.query<FlowSummaryRow>(`${flowSummarySql} where f.id = $1`, [flowId]),
      this.draft(flowId),
      this.db.query<FlowVersionRow>(`${flowVersionSql} where v.flow_id = $1 order by v.version desc`, [flowId]),
    ]);
    const row = summary.rows[0];
    if (!row) throw new NotFoundException("Flow not found");
    return { ...toSummary(row), draft, versions: versions.rows.map(toVersionSummary) };
  }

  async create(body: CreateFlowBody): Promise<FlowDetail> {
    try {
      const { rows } = await this.db.query<{ id: string }>(
        "insert into flows (key, name, draft) values ($1, $2, $3) returning id",
        [body.key, body.name, JSON.stringify(starterDefinition())],
      );
      return this.get(rows[0]!.id);
    } catch (error) {
      if (error instanceof DatabaseError && error.code === uniqueViolation) {
        throw new ConflictException(`A flow with key "${body.key}" already exists`);
      }
      throw error;
    }
  }

  async saveDraft(flowId: string, definition: FlowDefinition): Promise<FlowDetail> {
    const result = await this.db.query("update flows set draft = $2, updated_at = now() where id = $1", [
      flowId,
      JSON.stringify(definition),
    ]);
    if (result.rowCount === 0) throw new NotFoundException("Flow not found");
    return this.get(flowId);
  }

  async validate(flowId: string): Promise<ValidationResult> {
    return { issues: validateFlow(await this.draft(flowId)) };
  }

  async publish(flowId: string): Promise<FlowDetail> {
    await this.db.transaction(async (tx) => {
      const { rows } = await tx.query<{ draft: FlowDefinition; changed: boolean; next_version: number }>(
        `select f.draft,
                active.definition is distinct from f.draft as changed,
                coalesce((select max(version) from flow_versions where flow_id = f.id), 0) + 1 as next_version
         from flows f
         left join flow_versions active on active.flow_id = f.id and active.is_active
         where f.id = $1
         for update of f`,
        [flowId],
      );
      const flow = rows[0];
      if (!flow) throw new NotFoundException("Flow not found");
      if (!flow.changed) throw new ConflictException("The draft has no unpublished changes");
      const issues = validateFlow(flow.draft);
      if (issues.length > 0) {
        throw ApiException.issues(`Fix ${issues.length} ${issues.length === 1 ? "issue" : "issues"} before publishing`, issues);
      }
      await tx.query("update flow_versions set is_active = false where flow_id = $1 and is_active", [flowId]);
      await tx.query(
        "insert into flow_versions (flow_id, version, definition, is_active) values ($1, $2, $3, true)",
        [flowId, flow.next_version, JSON.stringify(flow.draft)],
      );
      await tx.query("update flows set updated_at = now() where id = $1", [flowId]);
    });
    return this.get(flowId);
  }

  async version(flowId: string, version: number): Promise<FlowVersion> {
    const { rows } = await this.db.query<FlowVersionRow>(`${flowVersionSql} where v.flow_id = $1 and v.version = $2`, [
      flowId,
      version,
    ]);
    const row = rows[0];
    if (!row) throw new NotFoundException("Version not found");
    return { ...toVersionSummary(row), flowId: row.flow_id, definition: row.definition };
  }

  async restoreVersion(flowId: string, version: number): Promise<FlowDetail> {
    const { definition } = await this.version(flowId, version);
    return this.saveDraft(flowId, definition);
  }

  private async draft(flowId: string): Promise<FlowDefinition> {
    const { rows } = await this.db.query<{ draft: FlowDefinition }>("select draft from flows where id = $1", [flowId]);
    if (!rows[0]) throw new NotFoundException("Flow not found");
    return rows[0].draft;
  }
}
