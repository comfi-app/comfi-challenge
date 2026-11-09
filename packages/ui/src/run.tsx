import { useEffect, useState } from "react";
import type { EndingOutcome, RunSummary } from "@comfi/kyb-contracts";
import { Badge, Button, type Tone } from "./components";
import { RunStatusBadge } from "./status";

const outcomes: Record<EndingOutcome, { label: string; tone: Tone }> = {
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

/** Run status, or its outcome once the run has completed. */
export function RunStateBadge({ status, outcome }: Pick<RunSummary, "status" | "outcome">) {
  if (status !== "completed" || !outcome) return <RunStatusBadge status={status} />;
  const { label, tone } = outcomes[outcome];
  return <Badge tone={tone}>{label}</Badge>;
}

/** A URL shown in full with copy and open buttons. */
export function CopyableLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    void navigator.clipboard.writeText(url).then(() => setCopied(true));
  };

  return (
    <div className="cf-copy-link">
      <code className="cf-copy-link__url" title={url}>
        {url}
      </code>
      <div className="cf-row">
        <Button size="sm" onClick={copy} aria-live="polite">
          {copied ? "Copied" : "Copy"}
        </Button>
        <a className="cf-btn cf-btn--secondary cf-btn--sm" href={url} target="_blank" rel="noreferrer">
          Open ↗
        </a>
      </div>
    </div>
  );
}
