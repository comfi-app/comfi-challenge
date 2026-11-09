import type { ApplicationStep, Step } from "@comfi/kyb-contracts";
import { Badge, Card, formatDateTime } from "@comfi/ui";
import { Fragment } from "react";
import { Answer } from "./Answer";

export function StepCard({ step, state }: { step: Step; state: ApplicationStep | undefined }) {
  const submittedAt = state?.status === "submitted" ? state.submittedAt : null;
  return (
    <Card
      title={
        <span className="cf-row">
          {step.name}
          {submittedAt ? <Badge tone="success">Submitted</Badge> : <Badge>Pending</Badge>}
        </span>
      }
      actions={submittedAt && <span className="apps-small cf-muted">{formatDateTime(submittedAt)}</span>}
    >
      {step.fields.length === 0 ? (
        <p className="cf-muted apps-flat">This step has no fields.</p>
      ) : (
        <dl className="cf-dl">
          {step.fields.map((field) => (
            <Fragment key={field.id}>
              <dt>{field.label}</dt>
              <dd>
                <Answer field={field} value={state?.values[field.key]} />
              </dd>
            </Fragment>
          ))}
        </dl>
      )}
    </Card>
  );
}
