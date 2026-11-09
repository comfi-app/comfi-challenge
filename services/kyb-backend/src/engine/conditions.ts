import type { Condition, FieldValue, Transition } from "@comfi/kyb-contracts";

export type Attributes = Readonly<Record<string, FieldValue>>;

/** String form used for comparisons; files compare by id. */
function comparable(value: FieldValue | undefined): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return String(value);
  return value.fileId;
}

function isSet(value: FieldValue | undefined): boolean {
  return value !== undefined && value !== null && value !== "" && value !== false;
}

export function evaluateCondition(condition: Condition, attributes: Attributes): boolean {
  const actual = attributes[condition.attribute];
  const expected = condition.value;
  switch (condition.operator) {
    case "equals":
      return typeof expected === "string" && comparable(actual) === expected;
    case "not_equals":
      return !(typeof expected === "string" && comparable(actual) === expected);
    case "in": {
      const value = comparable(actual);
      return Array.isArray(expected) && value !== null && expected.includes(value);
    }
    case "is_set":
      return isSet(actual);
    case "is_not_set":
      return !isSet(actual);
  }
}

export function transitionMatches(
  transition: Pick<Transition, "combinator" | "conditions">,
  attributes: Attributes,
): boolean {
  const { conditions, combinator } = transition;
  if (conditions.length === 0) return true;
  const check = (condition: Condition) => evaluateCondition(condition, attributes);
  return combinator === "all" ? conditions.every(check) : conditions.some(check);
}

/** First transition out of `stageId` (by ascending priority) whose conditions hold. */
export function pickTransition(
  transitions: readonly Transition[],
  stageId: string,
  attributes: Attributes,
): Transition | undefined {
  return transitions
    .filter((transition) => transition.source === stageId)
    .sort((a, b) => a.priority - b.priority)
    .find((transition) => transitionMatches(transition, attributes));
}
