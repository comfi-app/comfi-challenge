import type { FlowVersion } from "@comfi/kyb-contracts";
import { Button, formatDateTime } from "@comfi/ui";
import { plural } from "../format";
import { Icon } from "../icons";

interface VersionBannerProps {
  version: number;
  details: FlowVersion | undefined;
  onBack: () => void;
  onRestore: () => void;
}

export function VersionBanner({ version, details, onBack, onRestore }: VersionBannerProps) {
  return (
    <div className="fc-banner" role="status">
      <Icon name="eye" />
      <div className="fc-banner__text">
        <strong>Viewing v{version} (read-only)</strong>
        {details && (
          <span className="fc-muted">
            Published {formatDateTime(details.publishedAt)} · {plural(details.runCount, "run")}
            {details.isActive && " · live"}
          </span>
        )}
      </div>
      <Button size="sm" variant="ghost" onClick={onBack}>
        Back to draft
      </Button>
      <Button size="sm" onClick={onRestore}>
        Restore to draft
      </Button>
    </div>
  );
}
