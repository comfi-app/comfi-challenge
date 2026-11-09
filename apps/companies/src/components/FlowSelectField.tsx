import { Alert, FormField, Select } from "@comfi/ui";
import { Link } from "react-router";
import type { StartableFlow } from "../queries";

interface FlowSelectFieldProps {
  flows: readonly StartableFlow[] | undefined;
  value: string | undefined;
  onChange: (flowId: string) => void;
}

export function FlowSelectField({ flows, value, onChange }: FlowSelectFieldProps) {
  if (flows?.length === 0) {
    return (
      <Alert tone="warning" title="No published flows">
        Publish a flow in the <Link to="/flows">flow constructor</Link> to start onboarding.
      </Alert>
    );
  }
  return (
    <FormField label="Onboarding flow" hint="New runs use the flow's active version." required>
      {(id) => (
        <Select id={id} value={value ?? ""} disabled={!flows} onChange={(event) => onChange(event.target.value)}>
          {flows ? (
            flows.map((flow) => (
              <option key={flow.id} value={flow.id}>
                {flow.name} · v{flow.activeVersion}
              </option>
            ))
          ) : (
            <option value="">Loading flows…</option>
          )}
        </Select>
      )}
    </FormField>
  );
}
