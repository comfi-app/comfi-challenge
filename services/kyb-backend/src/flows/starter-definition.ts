import type { FlowDefinition } from "@comfi/kyb-contracts";

/** Smallest publishable flow: one reviewed stage that ends in approval or rejection. */
export const starterDefinition = (): FlowDefinition => ({
  stages: [
    {
      id: "stage-application",
      name: "Application",
      isEntry: true,
      advanceGate: "manual",
      rejectEndingId: "ending-rejected",
      steps: [
        {
          id: "step-details",
          name: "Details",
          fields: [{ id: "field-company-name", key: "company.name", label: "Company name", type: "text", required: true }],
          actions: [],
        },
      ],
      actions: [],
      position: { x: 80, y: 120 },
    },
  ],
  transitions: [
    {
      id: "tr-application-approved",
      source: "stage-application",
      target: { type: "ending", endingId: "ending-approved" },
      combinator: "all",
      conditions: [],
      priority: 10,
    },
  ],
  endings: [
    {
      id: "ending-approved",
      name: "Approved",
      outcome: "approved",
      title: "You're all set",
      body: "Your application has been approved.",
      actions: [],
      position: { x: 400, y: 120 },
    },
    {
      id: "ending-rejected",
      name: "Rejected",
      outcome: "rejected",
      title: "Application not approved",
      body: "Unfortunately we couldn't approve your application.",
      actions: [],
      position: { x: 400, y: 320 },
    },
  ],
});
