import type { ApplicantRunView } from "@comfi/kyb-contracts";
import { Alert } from "@comfi/ui";
import { useState } from "react";
import { Workspace } from "../layout";
import { initialStepIndex, isEditable, nextStepIndex, stageEntries, type StageEntry } from "./model";
import { StageNav } from "./StageNav";
import { StepForm } from "./StepForm";

interface RunnerProps {
  token: string;
  entries: readonly StageEntry[];
  current: StageEntry;
}

const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

/** Step-by-step form for an application the applicant can still edit. */
export function Runner({ token, entries, current }: RunnerProps) {
  const [stepIndex, setStepIndex] = useState(() => initialStepIndex(current));
  const { application, stage } = current;
  const step = stage.steps[stepIndex];

  const goTo = (index: number) => {
    setStepIndex(index);
    scrollToTop();
  };

  const onSubmitted = (view: ApplicantRunView) => {
    const updated = stageEntries(view).find((entry) => entry.application.id === application.id);
    if (view.currentApplicationId === application.id && updated && isEditable(updated.application.status)) {
      goTo(nextStepIndex(updated, stepIndex));
    } else {
      scrollToTop();
    }
  };

  return (
    <Workspace progress={<StageNav entries={entries} current={current} activeStepIndex={stepIndex} onSelectStep={goTo} />}>
      {application.status === "returned" && (
        <Alert tone="warning" title="A few things need your attention">
          {application.decision?.comment ?? "Please review your answers and submit the application again."}
        </Alert>
      )}
      {step && (
        <StepForm
          key={step.id}
          token={token}
          entry={current}
          step={step}
          stepIndex={stepIndex}
          onBack={stepIndex > 0 ? () => goTo(stepIndex - 1) : undefined}
          onSubmitted={onSubmitted}
        />
      )}
    </Workspace>
  );
}
