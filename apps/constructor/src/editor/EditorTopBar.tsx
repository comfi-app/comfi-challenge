import type { FlowDetail } from "@comfi/kyb-contracts";
import { Badge, Button } from "@comfi/ui";
import { Icon } from "../icons";
import { FlowStatusBadges } from "./FlowStatusBadges";

interface EditorTopBarProps {
  flow: FlowDetail;
  isDirty: boolean;
  isViewingVersion: boolean;
  isSaving: boolean;
  isValidating: boolean;
  onBack: () => void;
  onVersions: () => void;
  onValidate: () => void;
  onSave: () => void;
  onPublish: () => void;
}

export function EditorTopBar(props: EditorTopBarProps) {
  const { flow, isDirty, isViewingVersion, isSaving, isValidating } = props;
  const canPublish = isDirty || flow.hasUnpublishedChanges;

  return (
    <header className="fc-topbar">
      <div className="fc-topbar__title">
        <button type="button" className="fc-back" onClick={props.onBack}>
          <Icon name="back" size={14} /> Flows
        </button>
        <div className="fc-topbar__name">
          <h1>{flow.name}</h1>
          <code className="fc-key">{flow.key}</code>
        </div>
        <div className="fc-topbar__badges">
          <FlowStatusBadges flow={flow} />
          {isDirty && <Badge tone="warning">Unsaved edits</Badge>}
        </div>
      </div>
      <div className="fc-topbar__actions">
        <Button variant="ghost" onClick={props.onVersions}>
          <Icon name="history" size={14} /> Versions
        </Button>
        {!isViewingVersion && (
          <>
            <Button onClick={props.onValidate} disabled={isValidating || isSaving}>
              {isValidating ? "Validating…" : "Validate"}
            </Button>
            <Button onClick={props.onSave} disabled={!isDirty || isSaving} title="Save draft (⌘S)">
              {isSaving ? "Saving…" : "Save draft"}
            </Button>
            <Button
              variant="primary"
              onClick={props.onPublish}
              disabled={!canPublish || isSaving}
              title={canPublish ? undefined : "The live version already matches the draft"}
            >
              Publish
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
