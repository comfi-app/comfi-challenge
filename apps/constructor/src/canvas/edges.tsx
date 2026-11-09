import { cx } from "@comfi/ui";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, getSmoothStepPath, useStoreApi, type EdgeProps } from "@xyflow/react";
import type { RejectEdge, TransitionEdge } from "./graph";

const labelPosition = (x: number, y: number) => ({ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` });

export function TransitionEdgeView(props: EdgeProps<TransitionEdge>) {
  const { id, data, selected, markerEnd, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition } = props;
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const store = useStoreApi();
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} />
      {data && (
        <EdgeLabelRenderer>
          <button
            type="button"
            tabIndex={-1}
            className={cx("fc-edge-label nodrag nopan", selected && "is-selected")}
            style={labelPosition(labelX, labelY)}
            title={`Priority ${data.priority}: lower runs first`}
            onClick={() => store.getState().addSelectedEdges([id])}
          >
            <span className="fc-edge-label__priority">{data.priority}</span>
            <span className="fc-edge-label__text">{data.summary}</span>
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export function RejectEdgeView(props: EdgeProps<RejectEdge>) {
  const { id, markerEnd, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition } = props;
  const [path, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 12 });
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} className="fc-edge--reject" />
      <EdgeLabelRenderer>
        <div className="fc-edge-label fc-edge-label--reject" style={labelPosition(labelX, labelY)}>
          Operator rejects
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
