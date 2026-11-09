import { Alert, Loading, Page } from "@comfi/ui";
import { Link, useParams } from "react-router";
import { useFlowQuery } from "../api";
import { FlowEditor } from "../editor/FlowEditor";
import { errorMessage } from "../format";

export function EditorPage() {
  const { flowId } = useParams();
  if (!flowId) return null;
  return <LoadedEditor key={flowId} flowId={flowId} />;
}

function LoadedEditor({ flowId }: { flowId: string }) {
  const query = useFlowQuery(flowId);
  if (query.isPending) return <Loading label="Loading flow…" />;
  if (query.isError) {
    return (
      <Page>
        <Alert tone="danger" title="Couldn't open this flow">
          {errorMessage(query.error)}
        </Alert>
        <Link to="..">Back to flows</Link>
      </Page>
    );
  }
  // The editor owns the draft from here on; refetches only refresh versions and badges.
  return <FlowEditor flow={query.data} />;
}
