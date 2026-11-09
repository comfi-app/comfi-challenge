import { Injectable } from "@nestjs/common";
import type { Actor, EventType, JsonValue, TimelineEvent } from "@comfi/kyb-contracts";
import { Database, type Tx } from "../db/database";

export interface NewEvent {
  companyId: string;
  runId: string | null;
  applicationId: string | null;
  type: EventType;
  actor: Actor;
  payload: { [key: string]: JsonValue };
}

interface EventRow {
  id: string;
  type: EventType;
  actor: Actor;
  run_id: string | null;
  application_id: string | null;
  payload: { [key: string]: JsonValue };
  created_at: Date;
}

const toTimelineEvent = (row: EventRow): TimelineEvent => ({
  id: row.id,
  type: row.type,
  actor: row.actor,
  runId: row.run_id,
  applicationId: row.application_id,
  payload: row.payload,
  createdAt: row.created_at.toISOString(),
});

@Injectable()
export class EventsService {
  constructor(private readonly db: Database) {}

  async append(tx: Tx, event: NewEvent): Promise<void> {
    await tx.query(
      `insert into events (company_id, run_id, application_id, type, actor, payload)
       values ($1, $2, $3, $4, $5, $6)`,
      [event.companyId, event.runId, event.applicationId, event.type, event.actor, JSON.stringify(event.payload)],
    );
  }

  async forRun(runId: string): Promise<TimelineEvent[]> {
    const { rows } = await this.db.query<EventRow>(
      "select * from events where run_id = $1 order by created_at, id",
      [runId],
    );
    return rows.map(toTimelineEvent);
  }

  async forCompany(companyId: string): Promise<TimelineEvent[]> {
    const { rows } = await this.db.query<EventRow>(
      "select * from events where company_id = $1 order by created_at desc, id desc",
      [companyId],
    );
    return rows.map(toTimelineEvent);
  }
}
