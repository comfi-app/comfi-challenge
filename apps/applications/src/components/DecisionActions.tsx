import { Button, Dialog, FormField, Textarea, type ButtonProps } from "@comfi/ui";
import { useId, useState, type FormEvent } from "react";
import type { DecideApplication } from "../queries";

type DialogKind = "return" | "reject";

export function DecisionActions({ decide }: { decide: DecideApplication }) {
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const open = (kind: DialogKind) => {
    decide.reset();
    setDialog(kind);
  };
  const approving = decide.isPending && decide.variables.kind === "approve";

  return (
    <>
      <Button variant="danger" disabled={decide.isPending} onClick={() => open("reject")}>
        Reject
      </Button>
      <Button disabled={decide.isPending} onClick={() => open("return")}>
        Return to applicant
      </Button>
      <Button variant="primary" disabled={decide.isPending} onClick={() => decide.mutate({ kind: "approve" })}>
        {approving ? "Approving…" : "Approve"}
      </Button>
      {dialog && <DecisionDialog kind={dialog} decide={decide} onClose={() => setDialog(null)} />}
    </>
  );
}

const copy = {
  return: {
    title: "Return to applicant",
    body: "The applicant can update their answers and submit this stage again.",
    label: "What needs to change?",
    confirm: "Return application",
    variant: "primary",
  },
  reject: {
    title: "Reject application",
    body: "Rejecting ends this onboarding. This can't be undone.",
    label: "Reason",
    confirm: "Reject application",
    variant: "danger",
  },
} as const satisfies Record<DialogKind, { variant: ButtonProps["variant"] } & Record<string, string>>;

function DecisionDialog({ kind, decide, onClose }: { kind: DialogKind; decide: DecideApplication; onClose: () => void }) {
  const formId = useId();
  const [comment, setComment] = useState("");
  const text = copy[kind];
  const trimmed = comment.trim();
  const canSubmit = kind === "reject" || trimmed !== "";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    decide.mutate(kind === "return" ? { kind, comment: trimmed } : { kind, comment: trimmed || undefined }, {
      onSuccess: onClose,
    });
  };

  return (
    <Dialog
      title={text.title}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form={formId} variant={text.variant} disabled={!canSubmit || decide.isPending}>
            {decide.isPending ? "Saving…" : text.confirm}
          </Button>
        </>
      }
    >
      <form id={formId} className="cf-stack" onSubmit={submit}>
        <p className="apps-flat">{text.body}</p>
        <FormField label={text.label} required={kind === "return"} hint={kind === "reject" ? "Optional" : undefined}>
          {(id) => (
            <Textarea id={id} autoFocus value={comment} maxLength={2000} onChange={(event) => setComment(event.target.value)} />
          )}
        </FormField>
        {decide.error && <p className="cf-error apps-flat">{decide.error.message}</p>}
      </form>
    </Dialog>
  );
}
