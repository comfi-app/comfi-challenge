import type { FlowDefinition } from "@comfi/kyb-contracts";
import { Button } from "@comfi/ui";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  useReactFlow,
  useStoreApi,
  type Connection,
  type Dimensions,
  type EdgeChange,
  type EdgeTypes,
  type NodeChange,
  type NodeTypes,
  type XYPosition,
} from "@xyflow/react";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Icon } from "../icons";
import { createEnding, createStage, createTransition } from "../model/factories";
import type { FlowAction } from "../model/flow-reducer";
import { allFields, nextPriority, targetForNode } from "../model/selectors";
import type { Selection } from "../model/selection";
import { RejectEdgeView, TransitionEdgeView } from "./edges";
import { EndingNodeView } from "./EndingNode";
import { toEdges, toNodes, type CanvasEdge, type CanvasNode } from "./graph";
import { StageNodeView } from "./StageNode";

const nodeTypes = { stage: StageNodeView, ending: EndingNodeView } satisfies NodeTypes;
const edgeTypes = { transition: TransitionEdgeView, reject: RejectEdgeView } satisfies EdgeTypes;
const fitViewOptions = { padding: 0.2, maxZoom: 1 };

const miniMapColor = (node: CanvasNode) => {
  if (node.type === "stage") return "#adcdc6";
  return node.data.ending.outcome === "approved" ? "#7fc4a8" : "#f2a3a3";
};

interface FlowCanvasProps {
  definition: FlowDefinition;
  dispatch: Dispatch<FlowAction>;
  readOnly: boolean;
  selection: Selection | null;
  onSelectionChange: Dispatch<SetStateAction<Selection | null>>;
  flagged: ReadonlySet<string>;
}

/**
 * The flow definition is the single source of truth: nodes and edges are derived from it and every
 * canvas interaction is translated back into a reducer action.
 */
export function FlowCanvas({ definition, dispatch, readOnly, selection, onSelectionChange, flagged }: FlowCanvasProps) {
  // xyflow measures nodes itself; controlled nodes must carry those sizes back in.
  const [measured, setMeasured] = useState<Record<string, Dimensions>>({});
  const nodes = useMemo(() => toNodes(definition, { selection, flagged, measured }), [definition, selection, flagged, measured]);
  const edges = useMemo(() => toEdges(definition, { selection, flagged }), [definition, selection, flagged]);

  const select = (id: string, selected: boolean, kind: Selection["kind"]) =>
    onSelectionChange((current) => {
      if (selected) return current?.id === id ? current : { kind, id };
      return current?.id === id ? null : current;
    });

  const onNodesChange = (changes: NodeChange<CanvasNode>[]) => {
    for (const change of changes) {
      switch (change.type) {
        case "position": {
          const { position } = change;
          if (position) dispatch({ type: "node/move", id: change.id, position: { x: Math.round(position.x), y: Math.round(position.y) } });
          break;
        }
        case "dimensions": {
          const { dimensions } = change;
          if (dimensions) setMeasured((current) => ({ ...current, [change.id]: dimensions }));
          break;
        }
        case "select": {
          const kind = nodes.find((node) => node.id === change.id)?.type;
          if (kind) select(change.id, change.selected, kind);
          break;
        }
      }
    }
  };

  const onEdgesChange = (changes: EdgeChange<CanvasEdge>[]) => {
    for (const change of changes) {
      if (change.type === "select") select(change.id, change.selected, "transition");
    }
  };

  const isValidConnection = ({ source, target }: Pick<Connection, "source" | "target">) =>
    source !== target && definition.stages.some((stage) => stage.id === source) && targetForNode(definition, target) !== null;

  const onConnect = ({ source, target }: Connection) => {
    const transitionTarget = targetForNode(definition, target);
    if (!transitionTarget) return;
    const transition = createTransition(source, transitionTarget, nextPriority(definition, source));
    dispatch({ type: "transition/add", transition });
    onSelectionChange({ kind: "transition", id: transition.id });
  };

  const addStage = (position: XYPosition) => {
    const takenKeys = new Set(allFields(definition).map((field) => field.key));
    const stage = createStage(position, !definition.stages.some((candidate) => candidate.isEntry), takenKeys);
    dispatch({ type: "stage/add", stage });
    onSelectionChange({ kind: "stage", id: stage.id });
  };

  const addEnding = (position: XYPosition) => {
    const ending = createEnding(position, "approved");
    dispatch({ type: "ending/add", ending });
    onSelectionChange({ kind: "ending", id: ending.id });
  };

  return (
    <ReactFlow<CanvasNode, CanvasEdge>
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      isValidConnection={isValidConnection}
      nodesDraggable={!readOnly}
      nodesConnectable={!readOnly}
      // Deleting goes through the editor so stages can ask for confirmation.
      deleteKeyCode={null}
      multiSelectionKeyCode={null}
      selectionKeyCode={null}
      fitView
      fitViewOptions={fitViewOptions}
      minZoom={0.3}
      proOptions={{ hideAttribution: true }}
    >
      <Panel position="top-left">
        <CanvasToolbar readOnly={readOnly} onAddStage={addStage} onAddEnding={addEnding} />
      </Panel>
      <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#d4d4d4" />
      <Controls showInteractive={false} fitViewOptions={fitViewOptions} />
      <MiniMap<CanvasNode> pannable zoomable nodeColor={miniMapColor} nodeBorderRadius={8} />
    </ReactFlow>
  );
}

interface CanvasToolbarProps {
  readOnly: boolean;
  onAddStage: (position: XYPosition) => void;
  onAddEnding: (position: XYPosition) => void;
}

function CanvasToolbar({ readOnly, onAddStage, onAddEnding }: CanvasToolbarProps) {
  const store = useStoreApi<CanvasNode, CanvasEdge>();
  const { fitView } = useReactFlow<CanvasNode, CanvasEdge>();

  /** Top-left corner for a new node so that it lands roughly in the middle of the viewport. */
  const viewportCenter = (): XYPosition => {
    const { width, height, transform } = store.getState();
    const [x, y, zoom] = transform;
    return { x: Math.round((width / 2 - x) / zoom - 120), y: Math.round((height / 2 - y) / zoom - 60) };
  };

  return (
    <div className="fc-toolbar" role="toolbar" aria-label="Canvas">
      {!readOnly && (
        <>
          <Button size="sm" onClick={() => onAddStage(viewportCenter())}>
            <Icon name="plus" size={14} /> Stage
          </Button>
          <Button size="sm" onClick={() => onAddEnding(viewportCenter())}>
            <Icon name="plus" size={14} /> Ending
          </Button>
          <span className="fc-toolbar__divider" aria-hidden />
        </>
      )}
      <Button size="sm" variant="ghost" onClick={() => void fitView({ ...fitViewOptions, duration: 300 })}>
        <Icon name="fit" size={14} /> Fit view
      </Button>
    </div>
  );
}
