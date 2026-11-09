import { ApiError, type ApplicantRunView, type FieldValue, type Step } from "@comfi/kyb-contracts";
import { Alert, Badge, Button } from "@comfi/ui";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { api, errorMessage } from "../api";
import { FieldInput } from "../fields/FieldInput";
import { initialValues } from "../fields/values";
import { ArrowLeftIcon, ArrowRightIcon } from "../icons";
import { generateTestValues } from "../test-data";
import { otherPendingSteps, submittedValues, type StageEntry } from "./model";
import { useSubmitStep } from "./queries";

interface StepFormProps {
  token: string;
  entry: StageEntry;
  step: Step;
  stepIndex: number;
  onBack: (() => void) | undefined;
  onSubmitted: (view: ApplicantRunView) => void;
}

export function StepForm({ token, entry, step, stepIndex, onBack, onSubmitted }: StepFormProps) {
  const { application, stage } = entry;
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState(() => initialValues(step.fields, submittedValues(application, step.id)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = useSubmitStep(token);
  const fill = useMutation({
    mutationFn: () => generateTestValues(step.fields, (file) => api.applicant.upload(token, file)),
    onSuccess: (generated) => {
      setValues(generated);
      setErrors({});
      submit.reset();
    },
  });

  const isLastStep = stepIndex === stage.steps.length - 1;
  const submitsApplication = isLastStep && otherPendingSteps(entry, step.id) === 0;
  const submitLabel = !submitsApplication
    ? "Continue"
    : application.status === "returned"
      ? "Resubmit application"
      : "Submit application";

  const setValue = (key: string, value: FieldValue) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors(({ [key]: _cleared, ...rest }) => rest);
  };

  // mutateAsync rather than mutate callbacks: the submit may swap this screen for another one.
  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      onSubmitted(await submit.mutateAsync({ applicationId: application.id, stepId: step.id, values }));
    } catch (error) {
      if (!(error instanceof ApiError) || !error.body.fieldErrors) return;
      setErrors(error.body.fieldErrors);
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
    }
  };

  return (
    <form ref={formRef} className="ob-panel ob-step" onSubmit={onSubmit} noValidate>
      <header className="ob-step__header">
        <div className="ob-step__heading">
          <div className="ob-eyebrow">
            {stage.name} · Step {stepIndex + 1} of {stage.steps.length}
          </div>
          <h1 className="ob-step__title">{step.name}</h1>
          {step.description && <p className="ob-step__description">{step.description}</p>}
        </div>
        {step.fields.length > 0 && (
          <Button
            size="sm"
            className="ob-test-fill"
            disabled={fill.isPending || submit.isPending}
            onClick={() => fill.mutate()}
          >
            <Badge tone="accent" plain>
              Test
            </Badge>
            {fill.isPending ? "Filling…" : "Fill with test data"}
          </Button>
        )}
      </header>

      {fill.isError && (
        <Alert tone="warning">{errorMessage(fill.error, "Couldn't fill in test data. Please try again.")}</Alert>
      )}

      <div className="ob-step__fields">
        {step.fields.length === 0 && <p className="ob-muted">Nothing to fill in here. Continue when you're ready.</p>}
        {step.fields.map((field) => (
          <FieldInput
            key={field.id}
            field={field}
            token={token}
            value={values[field.key]}
            error={errors[field.key]}
            onChange={(value) => setValue(field.key, value)}
          />
        ))}
      </div>

      {submit.isError && (
        <Alert tone="danger">
          {errorMessage(submit.error, "We couldn't save your answers. Check your connection and try again.")}
        </Alert>
      )}

      <footer className="ob-step__footer">
        {onBack ? (
          <Button variant="ghost" onClick={onBack} disabled={submit.isPending}>
            <ArrowLeftIcon />
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" variant="primary" className="ob-step__submit" disabled={submit.isPending || fill.isPending}>
          {submit.isPending ? "Saving…" : submitLabel}
          {!submitsApplication && !submit.isPending && <ArrowRightIcon />}
        </Button>
      </footer>
    </form>
  );
}
