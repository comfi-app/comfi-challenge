import type { FlowDefinition } from "@comfi/kyb-contracts";
import { describe, expect, it } from "vitest";
import { validateFlow } from "../src/flows/flow-validation";
import { starterDefinition } from "../src/flows/starter-definition";
import { businessOnboardingV1, businessOnboardingV2 } from "../src/seed/business-onboarding";

const codes = (definition: FlowDefinition) => validateFlow(definition).map((issue) => issue.code);

/** Deep copy of the seeded flow that a test can break. */
const seeded = (): FlowDefinition => structuredClone(businessOnboardingV2);

describe("validateFlow", () => {
  it("accepts the starter and seeded flows", () => {
    expect(validateFlow(starterDefinition())).toEqual([]);
    expect(validateFlow(businessOnboardingV1)).toEqual([]);
    expect(validateFlow(businessOnboardingV2)).toEqual([]);
  });

  it("requires exactly one entry stage", () => {
    const none = seeded();
    none.stages[0]!.isEntry = false;
    expect(codes(none)).toEqual(["no_entry_stage"]);

    const two = seeded();
    two.stages[1]!.isEntry = true;
    expect(codes(two)).toEqual(["multiple_entry_stages"]);
  });

  it("reports duplicate ids and field keys", () => {
    const definition = seeded();
    const [personal, contact] = definition.stages[0]!.steps;
    contact!.id = personal!.id;
    contact!.fields[0]!.key = "applicant.firstName";
    expect(validateFlow(definition)).toEqual([
      expect.objectContaining({ code: "duplicate_id", ref: { kind: "step", id: "step-personal-info" } }),
      expect.objectContaining({ code: "duplicate_field_key", ref: { kind: "field", id: "field-email" } }),
    ]);
  });

  it("requires manual stages to reject into a rejected ending", () => {
    const missing = seeded();
    missing.stages[1]!.rejectEndingId = null;
    expect(codes(missing)).toEqual(["missing_reject_ending"]);

    const wrongOutcome = seeded();
    wrongOutcome.stages[1]!.rejectEndingId = "ending-approved";
    expect(codes(wrongOutcome)).toEqual(["invalid_reject_ending"]);
  });

  it("finds cycles and unreachable stages", () => {
    const cycle = seeded();
    cycle.transitions.push({
      id: "tr-parent-company-onboarding",
      source: "stage-parent-company",
      target: { type: "stage", stageId: "stage-onboarding" },
      combinator: "all",
      conditions: [],
      priority: 1,
    });
    expect(validateFlow(cycle)).toEqual([
      expect.objectContaining({ code: "stage_cycle", ref: { kind: "transition", id: "tr-parent-company-onboarding" } }),
    ]);

    const unreachable = seeded();
    unreachable.transitions = unreachable.transitions.filter((t) => t.id !== "tr-onboarding-parent-company");
    expect(validateFlow(unreachable)).toEqual([
      expect.objectContaining({ code: "unreachable_stage", ref: { kind: "stage", id: "stage-parent-company" } }),
    ]);
  });

  it("checks transition targets and condition values", () => {
    const definition = seeded();
    const [toParent, toApproved] = definition.transitions;
    toParent!.conditions = [
      { attribute: "company.legalForm", operator: "in", value: "branch" },
      { attribute: "company.website", operator: "is_set", value: "yes" },
    ];
    toApproved!.target = { type: "ending", endingId: "ending-missing" };
    expect(codes(definition)).toEqual(["invalid_condition", "invalid_condition", "unknown_transition_target"]);
  });
});
