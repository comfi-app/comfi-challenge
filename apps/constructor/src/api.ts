import type { KybClient } from "@comfi/kyb-contracts";
import { skipToken, useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";

const ApiContext = createContext<KybClient | null>(null);

export const ApiProvider = ApiContext.Provider;

export function useApi(): KybClient {
  const api = useContext(ApiContext);
  if (!api) throw new Error("useApi must be used inside <ApiProvider>");
  return api;
}

export const flowKeys = {
  all: ["flows"] as const,
  detail: (flowId: string) => ["flows", flowId] as const,
  version: (flowId: string, version: number | null) => ["flows", flowId, "versions", version] as const,
};

export function useFlowsQuery() {
  const api = useApi();
  return useQuery({ queryKey: flowKeys.all, queryFn: api.flows.list });
}

export function useFlowQuery(flowId: string) {
  const api = useApi();
  return useQuery({ queryKey: flowKeys.detail(flowId), queryFn: () => api.flows.get(flowId) });
}

export function useFlowVersionQuery(flowId: string, version: number | null) {
  const api = useApi();
  return useQuery({
    queryKey: flowKeys.version(flowId, version),
    queryFn: version === null ? skipToken : () => api.flows.version(flowId, version),
  });
}
