import type { KybClient } from "@comfi/kyb-contracts";

/** What the shell hands to every admin app it mounts. */
export interface AdminAppProps {
  api: KybClient;
  /** Public applicant link for a run. */
  onboardingUrl: (linkToken: string) => string;
}
