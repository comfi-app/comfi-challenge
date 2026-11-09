import type { FlowDefinition } from "./flow";
import type {
  ApiErrorBody,
  ApplicantRunView,
  ApplicationDetail,
  ApplicationListItem,
  ApplicationStatus,
  CompanyDetail,
  CompanySummary,
  CreateCompanyBody,
  CreateFlowBody,
  FlowDetail,
  FlowSummary,
  FlowVersion,
  RunSummary,
  ValidationResult,
} from "./api";
import type { FileRef, StepValues } from "./values";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(body.message);
  }
}

type Method = "GET" | "POST" | "PUT" | "DELETE";

export function createKybClient(baseUrl: string) {
  async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
    const isForm = body instanceof FormData;
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: body === undefined || isForm ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
    if (!res.ok) {
      const parsed = (await res.json().catch(() => null)) as ApiErrorBody | null;
      throw new ApiError(res.status, parsed ?? { statusCode: res.status, message: res.statusText });
    }
    return (res.status === 204 ? undefined : await res.json()) as T;
  }

  return {
    fileUrl: (fileId: string) => `${baseUrl}/files/${fileId}`,
    flows: {
      list: () => request<FlowSummary[]>("GET", "/admin/flows"),
      get: (flowId: string) => request<FlowDetail>("GET", `/admin/flows/${flowId}`),
      create: (body: CreateFlowBody) => request<FlowDetail>("POST", "/admin/flows", body),
      saveDraft: (flowId: string, definition: FlowDefinition) =>
        request<FlowDetail>("PUT", `/admin/flows/${flowId}/draft`, { definition }),
      validate: (flowId: string) => request<ValidationResult>("POST", `/admin/flows/${flowId}/validate`),
      publish: (flowId: string) => request<FlowDetail>("POST", `/admin/flows/${flowId}/publish`),
      version: (flowId: string, version: number) =>
        request<FlowVersion>("GET", `/admin/flows/${flowId}/versions/${version}`),
      restoreVersion: (flowId: string, version: number) =>
        request<FlowDetail>("POST", `/admin/flows/${flowId}/versions/${version}/restore`),
    },
    applications: {
      list: (status?: ApplicationStatus) =>
        request<ApplicationListItem[]>("GET", `/admin/applications${status ? `?status=${status}` : ""}`),
      get: (applicationId: string) => request<ApplicationDetail>("GET", `/admin/applications/${applicationId}`),
      approve: (applicationId: string, comment?: string) =>
        request<ApplicationDetail>("POST", `/admin/applications/${applicationId}/approve`, { comment }),
      reject: (applicationId: string, comment?: string) =>
        request<ApplicationDetail>("POST", `/admin/applications/${applicationId}/reject`, { comment }),
      return: (applicationId: string, comment: string) =>
        request<ApplicationDetail>("POST", `/admin/applications/${applicationId}/return`, { comment }),
    },
    companies: {
      list: () => request<CompanySummary[]>("GET", "/admin/companies"),
      get: (companyId: string) => request<CompanyDetail>("GET", `/admin/companies/${companyId}`),
      create: (body: CreateCompanyBody) => request<CompanyDetail>("POST", "/admin/companies", body),
      startRun: (companyId: string, flowId: string) =>
        request<RunSummary>("POST", `/admin/companies/${companyId}/runs`, { flowId }),
    },
    applicant: {
      run: (token: string) => request<ApplicantRunView>("GET", `/applicant/runs/${token}`),
      upload: (token: string, file: File | Blob, fileName?: string) => {
        const form = new FormData();
        form.append("file", file, fileName ?? (file instanceof File ? file.name : "upload"));
        return request<FileRef>("POST", `/applicant/runs/${token}/files`, form);
      },
      submitStep: (token: string, applicationId: string, stepId: string, values: StepValues) =>
        request<ApplicantRunView>(
          "POST",
          `/applicant/runs/${token}/applications/${applicationId}/steps/${stepId}/submit`,
          { values },
        ),
    },
  };
}

export type KybClient = ReturnType<typeof createKybClient>;
