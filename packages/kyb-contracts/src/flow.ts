import { z } from "zod";

const id = z.string().min(1).max(64);
const position = z.object({ x: z.number(), y: z.number() });

export const fieldTypes = ["text", "email", "phone", "date", "number", "select", "checkbox", "file"] as const;
export const FieldType = z.enum(fieldTypes);
export type FieldType = z.infer<typeof FieldType>;

export const FieldOption = z.object({ value: z.string().trim().min(1), label: z.string().trim().min(1) });
export type FieldOption = z.infer<typeof FieldOption>;

export const Field = z.object({
  id,
  /** Company attribute the answer is stored under. Unique across the flow. */
  key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_.]*$/, "Use letters, digits, dots and underscores"),
  label: z.string().min(1),
  type: FieldType,
  required: z.boolean(),
  placeholder: z.string().optional(),
  hint: z.string().optional(),
  options: z.array(FieldOption).optional(),
  accept: z.array(z.string()).optional(),
});
export type Field = z.infer<typeof Field>;

export const Action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("set_attribute"), attribute: z.string().min(1), value: z.string() }),
  z.object({
    type: z.literal("notify"),
    template: z.string().min(1),
    recipient: z.enum(["applicant", "operations"]),
  }),
]);
export type Action = z.infer<typeof Action>;
export type ActionType = Action["type"];

export const Step = z.object({
  id,
  name: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(Field),
  /** Run when the applicant submits this step. */
  actions: z.array(Action),
});
export type Step = z.infer<typeof Step>;

export const AdvanceGate = z.enum(["open", "manual"]);
export type AdvanceGate = z.infer<typeof AdvanceGate>;

export const Stage = z.object({
  id,
  name: z.string().min(1),
  description: z.string().optional(),
  isEntry: z.boolean(),
  /** open: routes as soon as the applicant submits. manual: waits for an operator decision. */
  advanceGate: AdvanceGate,
  /** Ending used when an operator rejects an application of this stage. */
  rejectEndingId: z.string().nullable(),
  steps: z.array(Step),
  /** Run when the applicant submits the last step of the stage. */
  actions: z.array(Action),
  position,
});
export type Stage = z.infer<typeof Stage>;

export const ConditionOperator = z.enum(["equals", "not_equals", "in", "is_set", "is_not_set"]);
export type ConditionOperator = z.infer<typeof ConditionOperator>;

export const Condition = z.object({
  attribute: z.string().min(1),
  operator: ConditionOperator,
  value: z.union([z.string().trim(), z.array(z.string().trim())]).optional(),
});
export type Condition = z.infer<typeof Condition>;

export const TransitionTarget = z.discriminatedUnion("type", [
  z.object({ type: z.literal("stage"), stageId: id }),
  z.object({ type: z.literal("ending"), endingId: id }),
]);
export type TransitionTarget = z.infer<typeof TransitionTarget>;

export const Transition = z.object({
  id,
  source: id,
  target: TransitionTarget,
  combinator: z.enum(["all", "any"]),
  /** Empty means the transition always matches. */
  conditions: z.array(Condition),
  /** Lower runs first. */
  priority: z.number().int(),
});
export type Transition = z.infer<typeof Transition>;

export const EndingOutcome = z.enum(["approved", "rejected"]);
export type EndingOutcome = z.infer<typeof EndingOutcome>;

export const Ending = z.object({
  id,
  name: z.string().min(1),
  outcome: EndingOutcome,
  title: z.string().min(1),
  body: z.string(),
  /** Run when a run reaches this ending. */
  actions: z.array(Action),
  position,
});
export type Ending = z.infer<typeof Ending>;

export const FlowDefinition = z.object({
  stages: z.array(Stage),
  transitions: z.array(Transition),
  endings: z.array(Ending),
});
export type FlowDefinition = z.infer<typeof FlowDefinition>;
