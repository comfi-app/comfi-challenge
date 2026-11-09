import type { Ending, FlowDefinition, Stage } from "@comfi/kyb-contracts";
import { MarkerType, type Dimensions, type Edge, type Node } from "@xyflow/react";
import { summarizeConditions } from "../model/conditions";
import type { Selection } from "../model/selection";

export type StageNode = Node<{ stage: Stage; flagged: boolean }, "stage">;
export type EndingNode = Node<{ ending: Ending; flagged: boolean }, "ending">;
export type CanvasNode = StageNode | EndingNode;

export type TransitionEdge = Edge<{ summary: string; priority: number }, "transition">;
export type RejectEdge = Edge<Record<string, never>, "reject">;
export type CanvasEdge = TransitionEdge | RejectEdge;

/** Handle ids on stage nodes. */
export const stageHandles = { next: "next", reject: "reject" } as const;

// SVG markers need literal colours; these mirror --cf-neutral-500, --cf-primary-600 and --cf-red-600.
const markerColors = { idle: "#a3a3a3", selected: "#318170", flagged: "#dc2626" } as const;

interface GraphState {
  selection: Selection | null;
  flagged: ReadonlySet<string>;
  measured: Readonly<Record<string, Dimensions>>;
}

export function toNodes(flow: FlowDefinition, { selection, flagged, measured }: GraphState): CanvasNode[] {
  const stages = flow.stages.map(
    (stage): StageNode => ({
      id: stage.id,
      type: "stage",
      position: stage.position,
      data: { stage, flagged: flagged.has(stage.id) },
      selected: selection?.id === stage.id,
      measured: measured[stage.id],
    }),
  );
  const endings = flow.endings.map(
    (ending): EndingNode => ({
      id: ending.id,
      type: "ending",
      position: ending.position,
      data: { ending, flagged: flagged.has(ending.id) },
      selected: selection?.id === ending.id,
      measured: measured[ending.id],
    }),
  );
  return [...stages, ...endings];
}

export function toEdges(flow: FlowDefinition, { selection, flagged }: Omit<GraphState, "measured">): CanvasEdge[] {
  const nodeIds = new Set([...flow.stages, ...flow.endings].map((element) => element.id));

  const transitions = flow.transitions.map((transition): TransitionEdge => {
    const selected = selection?.id === transition.id;
    const isFlagged = flagged.has(transition.id);
    return {
      id: transition.id,
      type: "transition",
      source: transition.source,
      sourceHandle: stageHandles.next,
      target: transition.target.type === "stage" ? transition.target.stageId : transition.target.endingId,
      selected,
      className: isFlagged ? "is-flagged" : undefined,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isFlagged ? markerColors.flagged : selected ? markerColors.selected : markerColors.idle,
      },
      data: { summary: summarizeConditions(transition), priority: transition.priority },
    };
  });

  const rejections = flow.stages.flatMap((stage): RejectEdge[] =>
    stage.advanceGate === "manual" && stage.rejectEndingId
      ? [
          {
            id: `reject:${stage.id}`,
            type: "reject",
            source: stage.id,
            sourceHandle: stageHandles.reject,
            target: stage.rejectEndingId,
            selectable: false,
            focusable: false,
            markerEnd: { type: MarkerType.ArrowClosed, color: markerColors.idle },
          },
        ]
      : [],
  );

  // Dangling references are reported by validation; xyflow would only warn about them.
  return [...transitions, ...rejections].filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
}
