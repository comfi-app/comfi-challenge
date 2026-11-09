import type { Condition, Transition } from "@comfi/kyb-contracts";
import { describe, expect, it } from "vitest";
import { evaluateCondition, pickTransition, transitionMatches, type Attributes } from "../src/engine/conditions";

const attributes: Attributes = {
  "company.legalForm": "branch",
  "consent.terms": true,
  "company.website": "",
  "documents.tradeLicence": { fileId: "8f0e5a8c-3a0e-4c55-9b8e-2d7f9c1d0a11", fileName: "l.pdf", mimeType: "application/pdf", size: 1 },
};

const check = (condition: Condition) => evaluateCondition(condition, attributes);

describe("evaluateCondition", () => {
  it("compares the string form of values", () => {
    expect(check({ attribute: "company.legalForm", operator: "equals", value: "branch" })).toBe(true);
    expect(check({ attribute: "consent.terms", operator: "equals", value: "true" })).toBe(true);
    expect(check({ attribute: "company.legalForm", operator: "not_equals", value: "llc" })).toBe(true);
    expect(check({ attribute: "missing", operator: "not_equals", value: "llc" })).toBe(true);
  });

  it("matches `in` against a list", () => {
    expect(check({ attribute: "company.legalForm", operator: "in", value: ["llc", "branch"] })).toBe(true);
    expect(check({ attribute: "company.legalForm", operator: "in", value: ["llc"] })).toBe(false);
    expect(check({ attribute: "missing", operator: "in", value: ["llc"] })).toBe(false);
  });

  it("treats empty strings, false and missing values as not set", () => {
    expect(check({ attribute: "documents.tradeLicence", operator: "is_set" })).toBe(true);
    expect(check({ attribute: "company.website", operator: "is_set" })).toBe(false);
    expect(check({ attribute: "missing", operator: "is_not_set" })).toBe(true);
    expect(evaluateCondition({ attribute: "flag", operator: "is_set" }, { flag: false })).toBe(false);
  });
});

describe("transitions", () => {
  const isBranch: Condition = { attribute: "company.legalForm", operator: "equals", value: "branch" };
  const isLlc: Condition = { attribute: "company.legalForm", operator: "equals", value: "llc" };

  it("combines conditions with all / any", () => {
    expect(transitionMatches({ combinator: "all", conditions: [isBranch, isLlc] }, attributes)).toBe(false);
    expect(transitionMatches({ combinator: "any", conditions: [isBranch, isLlc] }, attributes)).toBe(true);
    expect(transitionMatches({ combinator: "any", conditions: [] }, attributes)).toBe(true);
  });

  it("picks the first matching transition of the stage by priority", () => {
    const transition = (id: string, priority: number, conditions: Condition[], source = "stage-a"): Transition => ({
      id,
      source,
      target: { type: "ending", endingId: "ending" },
      combinator: "all",
      conditions,
      priority,
    });
    const transitions = [
      transition("fallback", 20, []),
      transition("llc", 5, [isLlc]),
      transition("branch", 10, [isBranch]),
      transition("other-stage", 1, [], "stage-b"),
    ];
    expect(pickTransition(transitions, "stage-a", attributes)?.id).toBe("branch");
    expect(pickTransition(transitions, "stage-a", {})?.id).toBe("fallback");
    expect(pickTransition(transitions, "stage-c", attributes)).toBeUndefined();
  });
});
