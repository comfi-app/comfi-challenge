import { ApiError, CreateFlowBody } from "@comfi/kyb-contracts";
import { Button, Dialog, FormField, Input } from "@comfi/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { flowKeys, useApi } from "../api";
import { errorMessage } from "../format";
import { slugify } from "../model/naming";

export function NewFlowDialog({ onClose }: { onClose: () => void }) {
  const api = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [customKey, setCustomKey] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // The key follows the name until it is edited by hand.
  const key = customKey ?? slugify(name);
  const parsed = CreateFlowBody.safeParse({ name, key });
  const fieldError = (path: "name" | "key") =>
    submitted && !parsed.success ? (parsed.error.issues.find((issue) => issue.path[0] === path)?.message ?? null) : null;

  const create = useMutation({
    mutationFn: api.flows.create,
    onSuccess: (flow) => {
      void queryClient.invalidateQueries({ queryKey: flowKeys.all, exact: true });
      void navigate(flow.id);
    },
  });
  const conflict = create.error instanceof ApiError && create.error.status === 409 ? create.error.message : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (parsed.success) create.mutate(parsed.data);
  };

  return (
    <Dialog
      title="New flow"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="fc-new-flow" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create flow"}
          </Button>
        </>
      }
    >
      <form id="fc-new-flow" className="cf-stack" onSubmit={submit} noValidate>
        <p>Starts with one reviewed stage and approved and rejected endings, ready to shape.</p>
        <FormField label="Name" required error={fieldError("name")}>
          {(id) => <Input id={id} autoFocus value={name} placeholder="Merchant onboarding" onChange={(event) => setName(event.target.value)} />}
        </FormField>
        <FormField label="Key" required error={fieldError("key") ?? conflict} hint="Lowercase letters, digits and dashes. Can't be changed later.">
          {(id) => (
            <Input id={id} className="fc-mono-input" value={key} placeholder="merchant-onboarding" onChange={(event) => setCustomKey(event.target.value)} />
          )}
        </FormField>
        {create.isError && !conflict && <p className="cf-error">{errorMessage(create.error)}</p>}
      </form>
    </Dialog>
  );
}
