import type { FlowSummary } from "@comfi/kyb-contracts";
import { Badge } from "@comfi/ui";

export function FlowStatusBadges({ flow }: { flow: Pick<FlowSummary, "activeVersion" | "hasUnpublishedChanges"> }) {
  return (
    <>
      {flow.activeVersion === null ? <Badge>Not published</Badge> : <Badge tone="success">v{flow.activeVersion} live</Badge>}
      {flow.activeVersion !== null && flow.hasUnpublishedChanges && <Badge tone="accent">Unpublished changes</Badge>}
    </>
  );
}
