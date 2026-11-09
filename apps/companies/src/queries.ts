import type { CreateCompanyBody, FlowSummary } from "@comfi/kyb-contracts";
import { useAdminApp } from "@comfi/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const companyKeys = {
  all: ["companies"] as const,
  list: () => [...companyKeys.all, "list"] as const,
  detail: (companyId: string) => [...companyKeys.all, "detail", companyId] as const,
  flows: () => [...companyKeys.all, "flows"] as const,
  applications: () => [...companyKeys.all, "applications"] as const,
};

export function useCompanyList() {
  const { api } = useAdminApp();
  return useQuery({ queryKey: companyKeys.list(), queryFn: () => api.companies.list() });
}

export function useCompany(companyId: string) {
  const { api } = useAdminApp();
  return useQuery({ queryKey: companyKeys.detail(companyId), queryFn: () => api.companies.get(companyId) });
}

export type StartableFlow = FlowSummary & { activeVersion: number };

/** Flows a run can be started on: those with a published, active version. */
export function useStartableFlows() {
  const { api } = useAdminApp();
  return useQuery({
    queryKey: companyKeys.flows(),
    queryFn: () => api.flows.list(),
    select: (flows) => flows.filter((flow): flow is StartableFlow => flow.activeVersion !== null),
  });
}

export function useApplicationList() {
  const { api } = useAdminApp();
  return useQuery({ queryKey: companyKeys.applications(), queryFn: () => api.applications.list() });
}

export function useCreateCompany() {
  const { api } = useAdminApp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCompanyBody) => api.companies.create(body),
    onSuccess: (company) => {
      queryClient.setQueryData(companyKeys.detail(company.id), company);
      void queryClient.invalidateQueries({ queryKey: companyKeys.list() });
    },
  });
}

export function useStartRun(companyId: string) {
  const { api } = useAdminApp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (flowId: string) => api.companies.startRun(companyId, flowId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companyKeys.all }),
  });
}
