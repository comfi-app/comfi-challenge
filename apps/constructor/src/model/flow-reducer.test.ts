import type { Condition, FlowDefinition, Stage } from "@comfi/kyb-contracts";
import { describe, expect, it } from "vitest";
import { withOperator } from "./conditions";
import { draftProblems } from "./draft-problems";
import { createAction, createEnding, createStage, createTransition } from "./factories";
import { flowReducer, type FlowAction } from "./flow-reducer";
import { sameJson } from "./same-json";

const stage = (id: string, isEntry = false): Stage => ({
  id,
  name: id,
  isEntry,
  advanceGate: "manual",
  rejectEndingId: "ending-rejected",
  steps: [
    {
      id: `${id}-step`,
      name: "Details",
      actions: [],
      fields: [
        { id: `${id}-a`, key: `${id}.a`, label: "A", type: "text", required: true },
        { id: `${id}-b`, key: `${id}.b`, label: "B", type: "text", required: true },
      ],
    },
  ],
  actions: [],
  position: { x: 0, y: 0 },
});

const flow: FlowDefinition = {
  stages: [stage("first", true), stage("second")],
  transitions: [
    { id: "tr-1", source: "first", target: { type: "stage", stageId: "second" }, combinator: "all", conditions: [], priority: 10 },
    { id: "tr-2", source: "second", target: { type: "ending", endingId: "ending-rejected" }, combinator: "all", conditions: [], priority: 10 },
  ],
  endings: [
    { id: "ending-rejected", name: "Rejected", outcome: "rejected", title: "No", body: "", actions: [], position: { x: 0, y: 0 } },
  ],
};

describe("flowReducer", () => {
  it("keeps a single entry stage", () => {
    const next = flowReducer(flow, { type: "stage/set-entry", stageId: "second", isEntry: true });
    expect(next.stages.map((candidate) => candidate.isEntry)).toEqual([false, true]);
  });

  it("removes the transitions of a deleted stage", () => {
    const next = flowReducer(flow, { type: "stage/remove", stageId: "second" });
    expect(next.transitions).toEqual([]);
  });

  it("detaches stages from an ending that is deleted or stops being a rejection", () => {
    const removed = flowReducer(flow, { type: "ending/remove", endingId: "ending-rejected" });
    const approved = flowReducer(flow, { type: "ending/update", endingId: "ending-rejected", patch: { outcome: "approved" } });
    for (const next of [removed, approved]) {
      expect(next.stages.every((candidate) => candidate.rejectEndingId === null)).toBe(true);
    }
    expect(removed.transitions.map((transition) => transition.id)).toEqual(["tr-1"]);
  });

  it("reorders fields within their step", () => {
    const next = flowReducer(flow, { type: "field/move", stageId: "first", stepId: "first-step", fieldId: "first-b", offset: -1 });
    expect(next.stages[0]?.steps[0]?.fields.map((field) => field.id)).toEqual(["first-b", "first-a"]);
  });

  it("gives a field options only while it is a select", () => {
    const ref = { stageId: "first", stepId: "first-step", fieldId: "first-a" };
    const select = flowReducer(flow, { type: "field/update", ...ref, patch: { type: "select" } });
    expect(select.stages[0]?.steps[0]?.fields[0]?.options).toEqual([]);
    const text = flowReducer(select, { type: "field/update", ...ref, patch: { type: "text" } });
    expect(sameJson(text, flow)).toBe(true);
  });
});

describe("withOperator", () => {
  it("reshapes the value for the new operator", () => {
    const condition: Condition = { attribute: "company.legalForm", operator: "equals", value: "branch" };
    expect(withOperator(condition, "in").value).toEqual(["branch"]);
    expect(withOperator(condition, "is_set").value).toBeUndefined();
  });
});

describe("draftProblems", () => {
  it("accepts new elements as soon as they are created", () => {
    const added = createStage({ x: 0, y: 0 }, false, new Set());
    const ending = createEnding({ x: 0, y: 0 }, "approved");
    const actions: FlowAction[] = [
      { type: "stage/add", stage: added },
      { type: "ending/add", ending },
      { type: "transition/add", transition: createTransition(added.id, { type: "ending", endingId: ending.id }, 10) },
    ];
    expect(draftProblems(actions.reduce(flowReducer, flow))).toEqual([]);
  });

  it("points schema problems at the element that has them", () => {
    const next = flowReducer(flow, { type: "stage/update", stageId: "second", patch: { actions: [createAction("notify")] } });
    expect(draftProblems(next)).toEqual([
      { code: "invalid_draft", message: 'Stage "second": template is required', ref: { kind: "stage", id: "second" } },
    ]);
  });
});
