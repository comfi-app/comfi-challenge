import type { StepStatus } from "@comfi/kyb-contracts";
import { CheckIcon } from "../icons";
import { stageStatusLabel, stepStatus, type StageEntry } from "./model";

type StepState = StepStatus | "current";

interface StageNavProps {
  entries: readonly StageEntry[];
  current: StageEntry;
  /** Step being edited, or null when the application is read-only. */
  activeStepIndex: number | null;
  onSelectStep?: (index: number) => void;
}

const stepState = (entry: StageEntry, stepId: string, isActive: boolean): StepState =>
  isActive ? "current" : stepStatus(entry.application, stepId);

const stepStateLabel: Record<StepState, string> = { current: "current step", submitted: "done", pending: "to do" };

export function StageNav({ entries, current, activeStepIndex, onSelectStep }: StageNavProps) {
  const previous = entries.filter((entry) => entry.application.id !== current.application.id);
  const { application, stage } = current;
  const steps = stage.steps.map((step, index) => ({
    step,
    index,
    state: stepState(current, step.id, index === activeStepIndex),
  }));
  const doneCount = steps.filter(({ step }) => stepStatus(application, step.id) === "submitted").length;
  const summary =
    activeStepIndex === null
      ? stageStatusLabel[application.status]
      : `Step ${activeStepIndex + 1} of ${stage.steps.length}`;

  return (
    <>
      <nav className="ob-nav" aria-label="Onboarding progress">
        <div className="ob-nav__title">Your progress</div>
        <ol className="ob-nav__stages">
          {previous.map((entry) => (
            <li key={entry.application.id} className="ob-nav__stage" data-state="done">
              <span className="ob-nav__marker">
                <CheckIcon size={14} />
              </span>
              <span className="ob-nav__stage-text">
                <span className="ob-nav__stage-name">{entry.stage.name}</span>
                <span className="ob-nav__stage-meta">{stageStatusLabel[entry.application.status]}</span>
              </span>
            </li>
          ))}
          <li className="ob-nav__stage" data-state="current" aria-current="step">
            <span className="ob-nav__marker">{previous.length + 1}</span>
            <span className="ob-nav__stage-text">
              <span className="ob-nav__stage-name">{stage.name}</span>
              <span className="ob-nav__stage-meta">
                {activeStepIndex === null ? summary : `${doneCount} of ${stage.steps.length} steps done`}
              </span>
            </span>
          </li>
        </ol>
        <ol className="ob-nav__steps">
          {steps.map(({ step, index, state }) => {
            const content = (
              <>
                <span className="ob-nav__dot">{state === "submitted" && <CheckIcon size={11} />}</span>
                <span className="ob-nav__step-name">{step.name}</span>
              </>
            );
            return (
              <li key={step.id}>
                {onSelectStep ? (
                  <button
                    type="button"
                    className="ob-nav__step"
                    data-state={state}
                    aria-current={state === "current" ? "step" : undefined}
                    onClick={() => onSelectStep(index)}
                  >
                    {content}
                  </button>
                ) : (
                  <div className="ob-nav__step" data-state={state}>
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <nav className="ob-stepper" aria-label="Onboarding progress">
        {previous.length > 0 && (
          <div className="ob-stepper__done">
            {previous.map((entry) => (
              <span key={entry.application.id} className="ob-stepper__chip">
                <CheckIcon size={12} />
                {entry.stage.name}
              </span>
            ))}
          </div>
        )}
        <div className="ob-stepper__head">
          <span className="ob-stepper__stage">{stage.name}</span>
          <span className="ob-stepper__summary">{summary}</span>
        </div>
        <div className="ob-stepper__bar">
          {steps.map(({ step, index, state }) => (
            <button
              key={step.id}
              type="button"
              className="ob-stepper__segment"
              data-state={state}
              disabled={!onSelectStep}
              aria-label={`${step.name}, ${stepStateLabel[state]}`}
              aria-current={state === "current" ? "step" : undefined}
              onClick={() => onSelectStep?.(index)}
            />
          ))}
        </div>
      </nav>
    </>
  );
}
