import type { FlowDefinition, FlowDetail } from "@comfi/kyb-contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { flowKeys, useApi } from "../api";

export function useFlowMutations(flowId: string) {
  const api = useApi();
  const queryClient = useQueryClient();

  const onDetail = (detail: FlowDetail) => {
    queryClient.setQueryData(flowKeys.detail(flowId), detail);
    void queryClient.invalidateQueries({ queryKey: flowKeys.all, exact: true });
  };

  return {
    save: useMutation({ mutationFn: (definition: FlowDefinition) => api.flows.saveDraft(flowId, definition), onSuccess: onDetail }),
    validate: useMutation({ mutationFn: () => api.flows.validate(flowId) }),
    publish: useMutation({ mutationFn: () => api.flows.publish(flowId), onSuccess: onDetail }),
    restore: useMutation({ mutationFn: (version: number) => api.flows.restoreVersion(flowId, version), onSuccess: onDetail }),
  };
}
