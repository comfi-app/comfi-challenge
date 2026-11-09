import type { FlowVersionSummary } from "@comfi/kyb-contracts";
import { Badge, Button, Drawer, EmptyState, cx, formatDateTime } from "@comfi/ui";
import { plural } from "../format";

interface VersionsDrawerProps {
  versions: readonly FlowVersionSummary[];
  viewing: number | null;
  onView: (version: number) => void;
  onRestore: (version: number) => void;
  onClose: () => void;
}

export function VersionsDrawer({ versions, viewing, onView, onRestore, onClose }: VersionsDrawerProps) {
  return (
    <Drawer title="Versions" onClose={onClose}>
      <p className="fc-muted">
        Every publish creates an immutable version. Runs stay on the version they started with, so older versions keep working.
      </p>
      {versions.length === 0 ? (
        <EmptyState title="Nothing published yet">Publish the draft to create version 1.</EmptyState>
      ) : (
        <ol className="fc-versions">
          {versions.map((version) => (
            <li key={version.id} className={cx("fc-version", viewing === version.version && "is-current")}>
              <div className="fc-version__main">
                <div className="fc-version__title">
                  <strong>v{version.version}</strong>
                  {version.isActive && <Badge tone="success">Live</Badge>}
                  {viewing === version.version && <Badge tone="info">Viewing</Badge>}
                </div>
                <div className="fc-muted">
                  Published {formatDateTime(version.publishedAt)} · {plural(version.runCount, "run")}
                </div>
              </div>
              <div className="fc-version__actions">
                <Button size="sm" variant="ghost" onClick={() => onView(version.version)}>
                  View
                </Button>
                <Button size="sm" onClick={() => onRestore(version.version)}>
                  Restore to draft
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Drawer>
  );
}
