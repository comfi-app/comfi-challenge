import type { FlowDefinition, PublishIssue } from "@comfi/kyb-contracts";
import { IconButton } from "@comfi/ui";
import { plural } from "../format";
import { Icon } from "../icons";
import { selectionForRef, type Selection } from "../model/selection";

/** Problems found by the last save attempt, validation or publish attempt. */
export interface IssueReport {
  source: "save" | "validate" | "publish";
  issues: PublishIssue[];
}

const headings: Record<IssueReport["source"], (count: number) => string> = {
  save: (count) => `Fix ${plural(count, "problem")} to save`,
  validate: (count) => `${plural(count, "issue")} block publishing`,
  publish: (count) => `Publishing stopped: ${plural(count, "issue")}`,
};

interface IssuesPanelProps {
  report: IssueReport;
  definition: FlowDefinition;
  onSelect: (selection: Selection) => void;
  onClose: () => void;
}

export function IssuesPanel({ report, definition, onSelect, onClose }: IssuesPanelProps) {
  return (
    <section className="fc-issues" aria-label="Issues">
      <header className="fc-issues__header">
        <Icon name="alert" />
        <h2 className="fc-issues__title">{headings[report.source](report.issues.length)}</h2>
        <IconButton label="Close issues" onClick={onClose}>
          <Icon name="close" size={14} />
        </IconButton>
      </header>
      <ul className="fc-issues__list">
        {report.issues.map((issue, index) => {
          const selection = issue.ref ? selectionForRef(definition, issue.ref) : null;
          return (
            <li key={`${issue.code}-${index}`}>
              {selection ? (
                <button type="button" className="fc-issues__item" onClick={() => onSelect(selection)}>
                  {issue.message}
                  <span className="fc-issues__kind">{issue.ref?.kind}</span>
                </button>
              ) : (
                <div className="fc-issues__item">{issue.message}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
