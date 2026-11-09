import { formatDateTime } from "@comfi/ui";
import { formatAnswer } from "../fields/answers";
import { ClockIcon } from "../icons";
import { StatusCard, Workspace } from "../layout";
import { submittedValues, type StageEntry } from "./model";
import { StageNav } from "./StageNav";

/** Read-only view of an application that is waiting for the Comfi team. */
export function ReviewScreen({ entries, current }: { entries: readonly StageEntry[]; current: StageEntry }) {
  const { application, stage } = current;
  const submittedAt = application.steps
    .flatMap((step) => (step.submittedAt ? [step.submittedAt] : []))
    .sort()
    .at(-1);

  return (
    <Workspace progress={<StageNav entries={entries} current={current} activeStepIndex={null} />}>
      <div className="ob-panel ob-review">
        <StatusCard tone="warning" icon={<ClockIcon size={22} />} title="We're reviewing your application">
          <p className="ob-status__body">
            Thanks for sending everything over. Our team is checking your details and will be in touch soon. You can
            close this page and come back to this link any time.
          </p>
          {submittedAt && <p className="ob-status__meta">Submitted {formatDateTime(submittedAt)}</p>}
        </StatusCard>

        <div className="ob-summary">
          <h2 className="ob-summary__title">{stage.name}: your answers</h2>
          {stage.steps.map((step) => {
            const values = submittedValues(application, step.id);
            return (
              <section key={step.id} className="ob-summary__step">
                <h3 className="ob-summary__step-name">{step.name}</h3>
                <dl className="ob-summary__list">
                  {step.fields.map((field) => (
                    <div key={field.id} className="ob-summary__row">
                      <dt>{field.label}</dt>
                      <dd>{formatAnswer(field, values[field.key])}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}
        </div>
      </div>
    </Workspace>
  );
}
