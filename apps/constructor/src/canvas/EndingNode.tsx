import { cx } from "@comfi/ui";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { EndingNode } from "./graph";

export function EndingNodeView({ data: { ending, flagged }, selected }: NodeProps<EndingNode>) {
  return (
    <div className={cx("fc-node fc-ending", `fc-ending--${ending.outcome}`, selected && "is-selected", flagged && "is-flagged")}>
      <Handle type="target" position={Position.Left} />
      <div className="fc-ending__pill">
        <span className="fc-ending__dot" aria-hidden />
        {ending.name || "Untitled ending"}
      </div>
      <div className="fc-ending__title">{ending.title}</div>
    </div>
  );
}
