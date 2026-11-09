import { randomBytes } from "node:crypto";
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  Action,
  ApplicationStatus,
  Decision,
  Ending,
  EndingOutcome,
  FieldValue,
  FileRef,
  FlowDefinition,
  RunStatus,
  Stage,
  StepValues,
} from "@comfi/kyb-contracts";
import { ApiException } from "../common/api-exception";
import type { Tx } from "../db/database";
import { EventsService } from "../events/events.service";
import { pickTransition, type Attributes } from "./conditions";
import { validateStepValues } from "./field-values";

export interface UploadInput {
  fileName: string;
  mimeType: string;
  content: Buffer;
}

export interface DecisionInput {
  kind: Decision["kind"];
  comment: string | null;
}

/** A locked run together with the definition of the version it is pinned to. */
interface Run {
  id: string;
  companyId: string;
  definition: FlowDefinition;
}

interface ApplicationRow {
  id: string;
  stage_id: string;
  status: ApplicationStatus;
}

interface DecisionRow extends ApplicationRow {
  run_id: string;
  company_id: string;
  definition: FlowDefinition;
}

const editableStatuses: readonly ApplicationStatus[] = ["in_progress", "returned"];

/**
 * Moves runs through their pinned flow definition. Every method expects to be called
 * inside a transaction and locks the run it changes.
 */
@Injectable()
export class EngineService {
  constructor(private readonly events: EventsService) {}

  async startRun(tx: Tx, companyId: string, flowId: string): Promise<string> {
    const { rows } = await tx.query<{ id: string; version: number; definition: FlowDefinition }>(
      "select id, version, definition from flow_versions where flow_id = $1 and is_active",
      [flowId],
    );
    const version = rows[0];
    if (!version) {
      const flow = await tx.query("select 1 from flows where id = $1", [flowId]);
      if (flow.rowCount === 0) throw new NotFoundException("Flow not found");
      throw new ConflictException("Flow has no published version");
    }
    const entry = version.definition.stages.find((stage) => stage.isEntry);
    if (!entry) throw new Error(`Published version ${version.id} has no entry stage`);

    const inserted = await tx.query<{ id: string }>(
      `insert into flow_runs (flow_id, flow_version_id, company_id, status, link_token)
       values ($1, $2, $3, 'active', $4) returning id`,
      [flowId, version.id, companyId, randomBytes(18).toString("base64url")],
    );
    const run: Run = { id: inserted.rows[0]!.id, companyId, definition: version.definition };
    await this.events.append(tx, {
      companyId,
      runId: run.id,
      applicationId: null,
      type: "run.started",
      actor: "operator",
      payload: { flowVersion: version.version },
    });
    await this.openApplication(tx, run, entry);
    return run.id;
  }

  async upload(tx: Tx, token: string, file: UploadInput): Promise<FileRef> {
    const run = await this.lockActiveRun(tx, token);
    const { rows } = await tx.query<{ id: string }>(
      `insert into files (company_id, run_id, file_name, mime_type, size, content)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [run.companyId, run.id, file.fileName, file.mimeType, file.content.length, file.content],
    );
    const ref: FileRef = {
      fileId: rows[0]!.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      size: file.content.length,
    };
    await this.events.append(tx, {
      companyId: run.companyId,
      runId: run.id,
      applicationId: null,
      type: "file.uploaded",
      actor: "applicant",
      payload: { ...ref },
    });
    return ref;
  }

  async submitStep(tx: Tx, token: string, applicationId: string, stepId: string, input: StepValues): Promise<void> {
    const run = await this.lockActiveRun(tx, token);
    const application = await this.currentApplication(tx, run.id);
    if (application?.id !== applicationId) {
      const known = await tx.query("select 1 from applications where id = $1 and run_id = $2", [applicationId, run.id]);
      if (known.rowCount === 0) throw new NotFoundException("Application not found");
      throw new ConflictException("This application is no longer open");
    }
    if (!editableStatuses.includes(application.status)) {
      throw new ConflictException("This application is not open for changes");
    }
    const stage = this.stageOf(run, application.stage_id);
    const step = stage.steps.find((candidate) => candidate.id === stepId);
    if (!step) throw new NotFoundException("Step not found");

    const result = validateStepValues(step.fields, input, await this.runFiles(tx, run.id, input));
    if (!result.ok) throw ApiException.fieldErrors("Some answers need attention", result.fieldErrors);
    const { values } = result;

    await tx.query(
      `update application_steps set status = 'submitted', values = $3, submitted_at = now()
       where application_id = $1 and step_id = $2`,
      [application.id, step.id, JSON.stringify(values)],
    );
    await this.setAttributes(tx, run.companyId, values);
    for (const field of step.fields) {
      const value = values[field.key];
      const fileId = value && typeof value === "object" ? value.fileId : null;
      await tx.query(
        `update files set application_id = null, field_key = null
         where application_id = $1 and field_key = $2 and id is distinct from $3`,
        [application.id, field.key, fileId],
      );
      if (value && typeof value === "object") {
        await tx.query("update files set application_id = $2, field_key = $3 where id = $1", [
          value.fileId,
          application.id,
          field.key,
        ]);
      }
    }
    await tx.query("update applications set updated_at = now() where id = $1", [application.id]);
    await this.touchRun(tx, run.id);
    await this.events.append(tx, {
      companyId: run.companyId,
      runId: run.id,
      applicationId: application.id,
      type: "step.submitted",
      actor: "applicant",
      payload: { stepId: step.id, stepName: step.name },
    });
    await this.runActions(tx, run, application.id, step.actions);

    const isLastStep = stage.steps.at(-1)?.id === step.id;
    if (isLastStep && (await this.allStepsSubmitted(tx, application.id))) {
      await this.submitApplication(tx, run, application.id, stage);
    }
  }

  async decide(tx: Tx, applicationId: string, decision: DecisionInput): Promise<void> {
    const { rows } = await tx.query<DecisionRow>(
      `select a.id, a.stage_id, a.status, a.run_id, r.company_id, v.definition
       from applications a
       join flow_runs r on r.id = a.run_id
       join flow_versions v on v.id = r.flow_version_id
       where a.id = $1
       for update of a, r`,
      [applicationId],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException("Application not found");
    if (row.status !== "in_review") throw new ConflictException("Only applications in review can be decided");
    const run: Run = { id: row.run_id, companyId: row.company_id, definition: row.definition };
    const stage = this.stageOf(run, row.stage_id);

    await tx.query(
      `update applications
       set status = $2, decision_kind = $2, decision_comment = $3, decided_at = now(), updated_at = now()
       where id = $1`,
      [applicationId, decision.kind, decision.comment],
    );
    await this.touchRun(tx, run.id);
    await this.events.append(tx, {
      companyId: run.companyId,
      runId: run.id,
      applicationId,
      type: `application.${decision.kind}`,
      actor: "operator",
      payload: { stageId: stage.id, stageName: stage.name, comment: decision.comment },
    });

    if (decision.kind === "approved") await this.route(tx, run, applicationId, stage);
    if (decision.kind === "rejected") {
      const ending = run.definition.endings.find((candidate) => candidate.id === stage.rejectEndingId) ?? null;
      await this.complete(tx, run, applicationId, "rejected", ending);
    }
  }

  private async submitApplication(tx: Tx, run: Run, applicationId: string, stage: Stage) {
    const status: ApplicationStatus = stage.advanceGate === "manual" ? "in_review" : "approved";
    await tx.query("update applications set status = $2, submitted_at = now(), updated_at = now() where id = $1", [
      applicationId,
      status,
    ]);
    await this.events.append(tx, {
      companyId: run.companyId,
      runId: run.id,
      applicationId,
      type: "application.submitted",
      actor: "applicant",
      payload: { stageId: stage.id, stageName: stage.name },
    });
    await this.runActions(tx, run, applicationId, stage.actions);
    if (status === "approved") {
      await this.events.append(tx, {
        companyId: run.companyId,
        runId: run.id,
        applicationId,
        type: "application.approved",
        actor: "system",
        payload: { stageId: stage.id, stageName: stage.name, comment: null },
      });
      await this.route(tx, run, applicationId, stage);
    }
  }

  private async route(tx: Tx, run: Run, applicationId: string, from: Stage) {
    const { definition } = run;
    const transition = pickTransition(definition.transitions, from.id, await this.attributes(tx, run.companyId));
    const base = { companyId: run.companyId, runId: run.id, applicationId, actor: "system" } as const;

    if (!transition) {
      await tx.query("update flow_runs set status = 'blocked', updated_at = now() where id = $1", [run.id]);
      await this.events.append(tx, { ...base, type: "run.blocked", payload: { stageId: from.id, stageName: from.name } });
      return;
    }

    const { target } = transition;
    if (target.type === "ending") {
      const ending = definition.endings.find((candidate) => candidate.id === target.endingId);
      if (!ending) throw new Error(`Ending ${target.endingId} is missing from the pinned definition`);
      await this.complete(tx, run, applicationId, ending.outcome, ending);
      return;
    }

    const next = this.stageOf(run, target.stageId);
    const nextApplicationId = await this.openApplication(tx, run, next);
    await this.events.append(tx, {
      ...base,
      type: "run.routed",
      payload: {
        transitionId: transition.id,
        fromStageId: from.id,
        toStageId: next.id,
        toStageName: next.name,
        nextApplicationId,
      },
    });
  }

  private async complete(tx: Tx, run: Run, applicationId: string, outcome: EndingOutcome, ending: Ending | null) {
    await tx.query(
      "update flow_runs set status = 'completed', outcome = $2, ending_id = $3, updated_at = now() where id = $1",
      [run.id, outcome, ending?.id ?? null],
    );
    await this.events.append(tx, {
      companyId: run.companyId,
      runId: run.id,
      applicationId,
      type: "run.completed",
      actor: "system",
      payload: { outcome, endingId: ending?.id ?? null, endingName: ending?.name ?? null },
    });
    if (ending) await this.runActions(tx, run, applicationId, ending.actions);
  }

  private async runActions(tx: Tx, run: Run, applicationId: string, actions: readonly Action[]) {
    const base = { companyId: run.companyId, runId: run.id, applicationId, actor: "system" } as const;
    for (const action of actions) {
      switch (action.type) {
        case "set_attribute":
          await this.setAttributes(tx, run.companyId, { [action.attribute]: action.value });
          await this.events.append(tx, {
            ...base,
            type: "attribute.set",
            payload: { attribute: action.attribute, value: action.value },
          });
          break;
        case "notify":
          await this.events.append(tx, {
            ...base,
            type: "notification.queued",
            payload: { template: action.template, recipient: action.recipient },
          });
          break;
      }
    }
  }

  private async openApplication(tx: Tx, run: Run, stage: Stage): Promise<string> {
    const { rows } = await tx.query<{ id: string }>(
      "insert into applications (run_id, stage_id, status) values ($1, $2, 'in_progress') returning id",
      [run.id, stage.id],
    );
    const applicationId = rows[0]!.id;
    await tx.query("insert into application_steps (application_id, step_id) select $1, unnest($2::text[])", [
      applicationId,
      stage.steps.map((step) => step.id),
    ]);
    return applicationId;
  }

  private async lockActiveRun(tx: Tx, token: string): Promise<Run> {
    const { rows } = await tx.query<{ id: string; company_id: string; status: RunStatus; definition: FlowDefinition }>(
      `select r.id, r.company_id, r.status, v.definition
       from flow_runs r join flow_versions v on v.id = r.flow_version_id
       where r.link_token = $1
       for update of r`,
      [token],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException("Run not found");
    if (row.status !== "active") throw new ConflictException("This onboarding is no longer active");
    return { id: row.id, companyId: row.company_id, definition: row.definition };
  }

  private async currentApplication(tx: Tx, runId: string): Promise<ApplicationRow | undefined> {
    const { rows } = await tx.query<ApplicationRow>(
      "select id, stage_id, status from applications where run_id = $1 order by created_at desc limit 1",
      [runId],
    );
    return rows[0];
  }

  private async allStepsSubmitted(tx: Tx, applicationId: string): Promise<boolean> {
    const { rows } = await tx.query<{ pending: number }>(
      "select count(*)::int as pending from application_steps where application_id = $1 and status = 'pending'",
      [applicationId],
    );
    return rows[0]!.pending === 0;
  }

  /** Files of this run referenced by the submitted values, keyed by id. */
  private async runFiles(tx: Tx, runId: string, values: StepValues): Promise<Map<string, FileRef>> {
    const ids = Object.values(values).flatMap((value) => (value && typeof value === "object" ? [value.fileId] : []));
    if (ids.length === 0) return new Map();
    const { rows } = await tx.query<{ id: string; file_name: string; mime_type: string; size: number }>(
      "select id, file_name, mime_type, size from files where run_id = $1 and id = any($2::uuid[])",
      [runId, ids],
    );
    return new Map(
      rows.map((row) => [row.id, { fileId: row.id, fileName: row.file_name, mimeType: row.mime_type, size: row.size }]),
    );
  }

  private async attributes(tx: Tx, companyId: string): Promise<Attributes> {
    const { rows } = await tx.query<{ attributes: Record<string, FieldValue> }>(
      "select attributes from companies where id = $1",
      [companyId],
    );
    return rows[0]?.attributes ?? {};
  }

  private async setAttributes(tx: Tx, companyId: string, values: Record<string, FieldValue>) {
    await tx.query("update companies set attributes = attributes || $2::jsonb where id = $1", [
      companyId,
      JSON.stringify(values),
    ]);
  }

  private async touchRun(tx: Tx, runId: string) {
    await tx.query("update flow_runs set updated_at = now() where id = $1", [runId]);
  }

  private stageOf(run: Run, stageId: string): Stage {
    const stage = run.definition.stages.find((candidate) => candidate.id === stageId);
    if (!stage) throw new Error(`Stage ${stageId} is missing from the pinned definition`);
    return stage;
  }
}
