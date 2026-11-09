import { useAdminApp } from "@comfi/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const applicationKeys = {
  all: ["applications"] as const,
  list: () => [...applicationKeys.all, "list"] as const,
  detail: (applicationId: string) => [...applicationKeys.all, "detail", applicationId] as const,
};

export function useApplicationList() {
  const { api } = useAdminApp();
  return useQuery({ queryKey: applicationKeys.list(), queryFn: () => api.applications.list() });
}

export function useApplication(applicationId: string) {
  const { api } = useAdminApp();
  return useQuery({
    queryKey: applicationKeys.detail(applicationId),
    queryFn: () => api.applications.get(applicationId),
  });
}

export type DecisionRequest =
  | { kind: "approve" }
  | { kind: "reject"; comment?: string }
  | { kind: "return"; comment: string };

export function useDecideApplication(applicationId: string) {
  const { api } = useAdminApp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (decision: DecisionRequest) => {
      switch (decision.kind) {
        case "approve":
          return api.applications.approve(applicationId);
        case "reject":
          return api.applications.reject(applicationId, decision.comment);
        case "return":
          return api.applications.return(applicationId, decision.comment);
      }
    },
    onSuccess: (application) => {
      queryClient.setQueryData(applicationKeys.detail(applicationId), application);
      void queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
  });
}

export type DecideApplication = ReturnType<typeof useDecideApplication>;
