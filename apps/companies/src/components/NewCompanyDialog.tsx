import { Button, Dialog, FormField, Input } from "@comfi/ui";
import { useId, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useCreateCompany, useStartableFlows } from "../queries";
import { FlowSelectField } from "./FlowSelectField";

export function NewCompanyDialog({ onClose }: { onClose: () => void }) {
  const formId = useId();
  const navigate = useNavigate();
  const flows = useStartableFlows();
  const create = useCreateCompany();
  const [name, setName] = useState("");
  const [selectedFlowId, setSelectedFlowId] = useState<string>();
  const flowId = selectedFlowId ?? flows.data?.[0]?.id;
  const canSubmit = name.trim() !== "" && flowId !== undefined && !create.isPending;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    create.mutate({ name: name.trim(), flowId }, { onSuccess: (company) => navigate(company.id) });
  };

  return (
    <Dialog
      title="New company"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form={formId} variant="primary" disabled={!canSubmit}>
            {create.isPending ? "Creating…" : "Create and start onboarding"}
          </Button>
        </>
      }
    >
      <form id={formId} className="cf-stack" onSubmit={submit}>
        <FormField label="Company name" required>
          {(id) => (
            <Input
              id={id}
              autoFocus
              value={name}
              maxLength={200}
              placeholder="e.g. Marina Spices Trading LLC"
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </FormField>
        <FlowSelectField flows={flows.data} value={flowId} onChange={setSelectedFlowId} />
        {flows.error && <p className="cf-error co-flat">Couldn't load flows: {flows.error.message}</p>}
        {create.error && <p className="cf-error co-flat">{create.error.message}</p>}
      </form>
    </Dialog>
  );
}
