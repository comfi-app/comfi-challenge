import type { Actor, EventType, JsonValue, TimelineEvent } from "@comfi/kyb-contracts";
import type { Tone } from "./components";
import { formatDateTime, timeAgo } from "./format";

interface EventView {
  title: string;
  detail?: string | null;
  comment?: string | null;
  tone?: Tone;
}

type Payload = TimelineEvent["payload"];

const text = (value: JsonValue | undefined) =>
  typeof value === "string" || typeof value === "number" ? String(value) : null;

const actorLabels: Record<Actor, string> = {
  applicant: "Applicant",
  operator: "Operator",
  system: "System",
};

const describers: Record<EventType, (payload: Payload) => EventView> = {
  "run.started": (p) => {
    const version = text(p.flowVersion);
    return { title: "Onboarding started", detail: version && `Flow version v${version}`, tone: "info" };
  },
  "run.routed": (p) => ({ title: `Moved to ${text(p.toStageName) ?? "next stage"}`, tone: "info" }),
  "run.completed": (p) => {
    const ending = text(p.endingName);
    return {
      title: p.outcome === "approved" ? "Onboarding approved" : "Onboarding rejected",
      detail: ending?.toLowerCase() === p.outcome ? null : ending,
      tone: p.outcome === "approved" ? "success" : "danger",
    };
  },
  "run.blocked": (p) => ({
    title: "Onboarding blocked",
    detail: `No route matched after ${text(p.stageName) ?? "this stage"}`,
    tone: "danger",
  }),
  "file.uploaded": (p) => ({ title: "File uploaded", detail: text(p.fileName) }),
  "step.submitted": (p) => ({ title: "Step submitted", detail: text(p.stepName) }),
  "application.submitted": (p) => ({ title: "Application submitted", detail: text(p.stageName), tone: "warning" }),
  "application.approved": (p) => ({
    title: "Application approved",
    detail: text(p.stageName),
    comment: text(p.comment),
    tone: "success",
  }),
  "application.rejected": (p) => ({
    title: "Application rejected",
    detail: text(p.stageName),
    comment: text(p.comment),
    tone: "danger",
  }),
  "application.returned": (p) => ({
    title: "Returned to applicant",
    detail: text(p.stageName),
    comment: text(p.comment),
    tone: "accent",
  }),
  "attribute.set": (p) => ({ title: "Attribute updated", detail: `${text(p.attribute)} = ${text(p.value)}` }),
  "notification.queued": (p) => ({
    title: "Notification queued",
    detail: `${text(p.template)} → ${text(p.recipient)}`,
  }),
};

export const describeEvent = (event: TimelineEvent): EventView => describers[event.type](event.payload);

/** Events newest first. */
export function Timeline({ events, empty = "No activity yet." }: { events: readonly TimelineEvent[]; empty?: string }) {
  if (events.length === 0) return <p className="cf-muted cf-timeline-empty">{empty}</p>;
  const sorted = events.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <ol className="cf-timeline">
      {sorted.map((event) => (
        <TimelineItem key={event.id} event={event} />
      ))}
    </ol>
  );
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const { title, detail, comment, tone = "neutral" } = describeEvent(event);
  return (
    <li className="cf-timeline__item" data-tone={tone}>
      <span className="cf-timeline__dot" aria-hidden />
      <div className="cf-timeline__title">{title}</div>
      {detail && <div className="cf-timeline__detail">{detail}</div>}
      {comment && <blockquote className="cf-timeline__comment">{comment}</blockquote>}
      <div className="cf-timeline__meta">
        {actorLabels[event.actor]} ·{" "}
        <time dateTime={event.createdAt} title={formatDateTime(event.createdAt)}>
          {timeAgo(event.createdAt)}
        </time>
      </div>
    </li>
  );
}
