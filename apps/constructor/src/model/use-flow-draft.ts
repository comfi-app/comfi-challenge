import type { FlowDefinition } from "@comfi/kyb-contracts";
import { useCallback, useMemo, useReducer, useState } from "react";
import { flowReducer } from "./flow-reducer";
import { sameJson } from "./same-json";

/** Draft being edited plus the last version the server confirmed, to tell whether there is anything to save. */
export function useFlowDraft(initial: FlowDefinition) {
  const [definition, dispatch] = useReducer(flowReducer, initial);
  const [saved, setSaved] = useState(initial);
  const isDirty = useMemo(() => !sameJson(definition, saved), [definition, saved]);

  const reset = useCallback((next: FlowDefinition) => {
    dispatch({ type: "flow/replace", definition: next });
    setSaved(next);
  }, []);

  return { definition, dispatch, isDirty, markSaved: setSaved, reset };
}

export type FlowDraft = ReturnType<typeof useFlowDraft>;
