import type { Condition, ConditionOperator, Transition } from "@comfi/kyb-contracts";

export const operators: readonly { value: ConditionOperator; label: string; symbol: string }[] = [
  { value: "equals", label: "equals", symbol: "=" },
  { value: "not_equals", label: "does not equal", symbol: "≠" },
  { value: "in", label: "is one of", symbol: "in" },
  { value: "is_set", label: "is set", symbol: "is set" },
  { value: "is_not_set", label: "is not set", symbol: "is not set" },
];

/** How many values an operator compares against. */
export function operatorArity(operator: ConditionOperator): "one" | "many" | "none" {
  switch (operator) {
    case "equals":
    case "not_equals":
      return "one";
    case "in":
      return "many";
    case "is_set":
    case "is_not_set":
      return "none";
  }
}

/** Switches the operator and reshapes the value to what the new operator expects. */
export function withOperator(condition: Condition, operator: ConditionOperator): Condition {
  const { value } = condition;
  const values = Array.isArray(value) ? value : value ? [value] : [];
  switch (operatorArity(operator)) {
    case "one":
      return { ...condition, operator, value: values[0] ?? "" };
    case "many":
      return { ...condition, operator, value: values };
    case "none":
      return { ...condition, operator, value: undefined };
  }
}

function describeCondition({ attribute, operator, value }: Condition): string {
  const symbol = operators.find((candidate) => candidate.value === operator)?.symbol ?? operator;
  if (value === undefined) return `${attribute} ${symbol}`;
  return `${attribute} ${symbol} ${Array.isArray(value) ? `[${value.join(", ")}]` : value}`;
}

/** Short label for a transition edge, e.g. `company.legalForm = branch`. */
export function summarizeConditions({ conditions, combinator }: Pick<Transition, "conditions" | "combinator">): string {
  if (conditions.length === 0) return "Always";
  return conditions.map(describeCondition).join(combinator === "all" ? " and " : " or ");
}
