import { createContext, useContext } from "react";
import type { KybClient } from "@comfi/kyb-contracts";

/** What the shell hands to every admin app it mounts. */
export interface AdminAppProps {
  api: KybClient;
  /** Public applicant link for a run. */
  onboardingUrl: (linkToken: string) => string;
}

export const AdminAppContext = createContext<AdminAppProps | null>(null);

/** Props of the admin app being rendered; requires an `AdminAppContext` provider. */
export function useAdminApp(): AdminAppProps {
  const props = useContext(AdminAppContext);
  if (!props) throw new Error("useAdminApp must be used inside AdminAppContext");
  return props;
}
