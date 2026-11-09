import { ApiError, createKybClient } from "@comfi/kyb-contracts";

export const api = createKybClient(import.meta.env.VITE_KYB_API_URL ?? "http://localhost:4000");

export const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404;

/** Server messages are written for applicants; anything else (e.g. a dropped connection) gets the fallback. */
export const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;
