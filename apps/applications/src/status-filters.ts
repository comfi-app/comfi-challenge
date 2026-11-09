import type { ApplicationListItem, ApplicationStatus } from "@comfi/kyb-contracts";

export const statusFilters = ["in_review", "in_progress", "returned", "approved", "rejected", "all"] as const satisfies readonly (
  | ApplicationStatus
  | "all"
)[];
export type StatusFilter = (typeof statusFilters)[number];

export const matchesFilter = (filter: StatusFilter, application: ApplicationListItem) =>
  filter === "all" || application.status === filter;
