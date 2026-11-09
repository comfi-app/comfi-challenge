import { Badge, cx } from "@comfi/ui";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { plural } from "../format";
import { actionCount } from "../model/selectors";
import { stageHandles, type StageNode } from "./graph";

export function StageNodeView({ data: { stage, flagged }, selected }: NodeProps<StageNode>) {
  const isManual = stage.advanceGate === "manual";
  const actions = actionCount(stage);
  return (
    <div className={cx("fc-node fc-stage", selected && "is-selected", flagged && "is-flagged")}>
      <Handle type="target" position={Position.Left} />
      <header className="fc-stage__header">
        <div className="fc-stage__meta">
          <span className="fc-node__eyebrow">Stage</span>
          {stage.isEntry && (
            <Badge tone="accent" plain>
              Entry
            </Badge>
          )}
        </div>
        <div className="fc-node__title">{stage.name || "Untitled stage"}</div>
        <Badge tone={isManual ? "warning" : "info"}>{isManual ? "Manual review" : "Auto-advance"}</Badge>
      </header>
      {stage.steps.length > 0 ? (
        <ol className="fc-stage__steps">
          {stage.steps.map((step) => (
            <li key={step.id}>
              <span className="fc-stage__step-name">{step.name || "Untitled step"}</span>
              <span className="fc-muted">{plural(step.fields.length, "field")}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="fc-stage__empty">No steps yet</div>
      )}
      {(actions > 0 || flagged) && (
        <footer className="fc-stage__footer">
          {actions > 0 && <span>{plural(actions, "action")}</span>}
          {flagged && <span className="fc-node__flag">Needs attention</span>}
        </footer>
      )}
      <Handle id={stageHandles.next} type="source" position={Position.Right} />
      {/* Always rendered so xyflow keeps its position measured; only shown while the stage is reviewed manually. */}
      <Handle
        id={stageHandles.reject}
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className={cx("fc-handle--reject", !isManual && "is-hidden")}
      />
    </div>
  );
}
