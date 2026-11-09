import type { StepValues } from "@comfi/kyb-contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, isNotFound } from "../api";

export const runQueryKey = (token: string) => ["applicant-run", token] as const;

export const useRun = (token: string) =>
  useQuery({
    queryKey: runQueryKey(token),
    queryFn: () => api.applicant.run(token),
    retry: (failureCount, error) => !isNotFound(error) && failureCount < 2,
  });

interface SubmitStepInput {
  applicationId: string;
  stepId: string;
  values: StepValues;
}

/** The response is the whole updated run, so it replaces the cached one. */
export function useSubmitStep(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, stepId, values }: SubmitStepInput) =>
      api.applicant.submitStep(token, applicationId, stepId, values),
    onSuccess: (view) => queryClient.setQueryData(runQueryKey(token), view),
  });
}
