import type { ExtractedLicence, Reason, Verdict } from './trade-licence-rules';

export const CHECK_STATUSES = ['pending', 'approved', 'rejected', 'manual_review'] as const satisfies readonly (
  | 'pending'
  | Verdict['status']
)[];
export type CheckStatus = (typeof CHECK_STATUSES)[number];

export const CHECK_TYPES = ['trade_licence'] as const;
export type CheckType = (typeof CHECK_TYPES)[number];

export interface SubmittedDocument {
  companyName: string;
  licenceNumber: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface Check {
  id: string;
  type: CheckType;
  status: CheckStatus;
  reasons: Reason[];
  reference: string | null;
  submitted: SubmittedDocument;
  extracted: ExtractedLicence | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CheckCompletedEvent {
  event: 'check.completed';
  check: Check;
}
