import { ApiError } from "@comfi/kyb-contracts";

export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const details = Object.entries(error.body.fieldErrors ?? {}).map(([path, message]) => `${path}: ${message}`);
    return [error.message, ...details].join(" · ");
  }
  return error instanceof Error ? error.message : "Something went wrong";
}
