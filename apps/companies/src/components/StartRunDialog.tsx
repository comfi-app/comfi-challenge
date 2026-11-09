import { Button, Dialog } from "@comfi/ui";
import { useId, useState, type FormEvent } from "react";
import { useStartableFlows, useStartRun } from "../queries";
import { FlowSelectField } from "./FlowSelectField";

export function StartRunDialog({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const formId = useId();
  const flows = useStartableFlows();
  const startRun = useStartRun(companyId);
  const [selectedFlowId, setSelectedFlowId] = useState<string>();
  const flowId = selectedFlowId ?? flows.data?.[0]?.id;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (flowId) startRun.mutate(flowId, { onSuccess: onClose });
  };

  return (
    <Dialog
      title="Start new run"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form={formId} variant="primary" disabled={!flowId || startRun.isPending}>
            {startRun.isPending ? "Starting…" : "Start run"}
          </Button>
        </>
      }
    >
      <form id={formId} className="cf-stack" onSubmit={submit}>
        <p className="co-flat">The applicant gets a new link and starts from the flow's first stage.</p>
        <FlowSelectField flows={flows.data} value={flowId} onChange={setSelectedFlowId} />
        {flows.error && <p className="cf-error co-flat">Couldn't load flows: {flows.error.message}</p>}
        {startRun.error && <p className="cf-error co-flat">{startRun.error.message}</p>}
      </form>
    </Dialog>
  );
}
