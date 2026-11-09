import type { Field, FieldOption, FlowDefinition } from "@comfi/kyb-contracts";

const options = (...labels: string[]): FieldOption[] => labels.map((label) => ({ value: label, label }));

const documentTypes = ["application/pdf", "image/png", "image/jpeg"];
const documentHint = "PDF, PNG or JPG, up to 10 MB";

const companyWebsite: Field = {
  id: "field-company-website",
  key: "company.website",
  label: "Company website",
  type: "text",
  required: false,
  placeholder: "https://",
};

/** Version 2 of the seeded flow: version 1 plus the optional company website. */
export const businessOnboardingV2: FlowDefinition = {
  stages: [
    {
      id: "stage-onboarding",
      name: "Onboarding",
      description: "Who is applying and which business they represent.",
      isEntry: true,
      advanceGate: "manual",
      rejectEndingId: "ending-rejected",
      position: { x: 0, y: 160 },
      actions: [{ type: "notify", template: "application_in_review", recipient: "operations" }],
      steps: [
        {
          id: "step-personal-info",
          name: "Personal info",
          description: "Tell us about yourself.",
          actions: [],
          fields: [
            { id: "field-first-name", key: "applicant.firstName", label: "First name", type: "text", required: true },
            { id: "field-last-name", key: "applicant.lastName", label: "Last name", type: "text", required: true },
            { id: "field-date-of-birth", key: "applicant.dateOfBirth", label: "Date of birth", type: "date", required: true },
            {
              id: "field-nationality",
              key: "applicant.nationality",
              label: "Nationality",
              type: "select",
              required: true,
              options: options("United Arab Emirates", "India", "Pakistan", "United Kingdom", "Egypt", "Philippines", "Other"),
            },
            {
              id: "field-role",
              key: "applicant.role",
              label: "Your role in the company",
              type: "select",
              required: true,
              options: options("Owner", "Director", "Authorised signatory"),
            },
          ],
        },
        {
          id: "step-contact-details",
          name: "Contact details",
          description: "How we can reach you.",
          actions: [{ type: "notify", template: "welcome", recipient: "applicant" }],
          fields: [
            { id: "field-email", key: "contact.email", label: "Email", type: "email", required: true },
            {
              id: "field-phone",
              key: "contact.phone",
              label: "Phone",
              type: "phone",
              required: true,
              placeholder: "+971 50 123 4567",
            },
            { id: "field-address", key: "contact.address", label: "Address", type: "text", required: true },
            {
              id: "field-city",
              key: "contact.city",
              label: "Emirate",
              type: "select",
              required: true,
              options: options("Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"),
            },
          ],
        },
        {
          id: "step-company-details",
          name: "Company details",
          description: "As shown on your trade licence.",
          actions: [],
          fields: [
            { id: "field-legal-name", key: "company.legalName", label: "Legal name", type: "text", required: true },
            {
              id: "field-licence-number",
              key: "company.licenceNumber",
              label: "Trade licence number",
              type: "text",
              required: true,
              placeholder: "CN-1234567",
            },
            {
              id: "field-issuing-authority",
              key: "company.issuingAuthority",
              label: "Issuing authority",
              type: "select",
              required: true,
              options: options("Dubai DET", "Abu Dhabi ADDED", "Sharjah SEDD", "DMCC", "JAFZA", "IFZA"),
            },
            {
              id: "field-legal-form",
              key: "company.legalForm",
              label: "Legal form",
              type: "select",
              required: true,
              options: [
                { value: "llc", label: "Limited Liability Company" },
                { value: "sole_establishment", label: "Sole Establishment" },
                { value: "free_zone_establishment", label: "Free Zone Establishment" },
                { value: "branch", label: "Branch of a foreign company" },
              ],
            },
            companyWebsite,
          ],
        },
        {
          id: "step-trade-licence",
          name: "Trade licence",
          description: "Upload your licence and confirm the declarations.",
          actions: [],
          fields: [
            {
              id: "field-trade-licence",
              key: "documents.tradeLicence",
              label: "Trade licence",
              type: "file",
              required: true,
              accept: documentTypes,
              hint: documentHint,
            },
            {
              id: "field-consent-accuracy",
              key: "consent.accuracy",
              label: "I confirm the information I provided is accurate and complete",
              type: "checkbox",
              required: true,
            },
            {
              id: "field-consent-verification",
              key: "consent.verification",
              label: "I consent to Comfi verifying my company details and documents with third parties",
              type: "checkbox",
              required: true,
            },
            {
              id: "field-consent-terms",
              key: "consent.terms",
              label: "I accept the Terms of Service and Privacy Policy",
              type: "checkbox",
              required: true,
            },
          ],
        },
      ],
    },
    {
      id: "stage-parent-company",
      name: "Parent company",
      description: "Branches also tell us about the company they belong to.",
      isEntry: false,
      advanceGate: "manual",
      rejectEndingId: "ending-rejected",
      position: { x: 420, y: -160 },
      actions: [{ type: "notify", template: "application_in_review", recipient: "operations" }],
      steps: [
        {
          id: "step-parent-company-details",
          name: "Parent company details",
          actions: [],
          fields: [
            { id: "field-parent-legal-name", key: "parent.legalName", label: "Legal name", type: "text", required: true },
            {
              id: "field-parent-country",
              key: "parent.country",
              label: "Country of registration",
              type: "select",
              required: true,
              options: options("United Kingdom", "India", "Saudi Arabia", "Germany", "United States", "Other"),
            },
            {
              id: "field-parent-registration-certificate",
              key: "parent.registrationCertificate",
              label: "Certificate of registration",
              type: "file",
              required: true,
              accept: documentTypes,
              hint: documentHint,
            },
          ],
        },
      ],
    },
  ],
  transitions: [
    {
      id: "tr-onboarding-parent-company",
      source: "stage-onboarding",
      target: { type: "stage", stageId: "stage-parent-company" },
      combinator: "all",
      conditions: [{ attribute: "company.legalForm", operator: "equals", value: "branch" }],
      priority: 10,
    },
    {
      id: "tr-onboarding-approved",
      source: "stage-onboarding",
      target: { type: "ending", endingId: "ending-approved" },
      combinator: "all",
      conditions: [],
      priority: 20,
    },
    {
      id: "tr-parent-company-approved",
      source: "stage-parent-company",
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
      title: "Your business is verified",
      body: "Thanks for completing onboarding. Your Comfi account is ready to use.",
      position: { x: 860, y: 180 },
      actions: [
        { type: "set_attribute", attribute: "kyb.status", value: "verified" },
        { type: "notify", template: "kyb_approved", recipient: "applicant" },
      ],
    },
    {
      id: "ending-rejected",
      name: "Rejected",
      outcome: "rejected",
      title: "We couldn't verify your business",
      body: "Unfortunately we can't open an account for your business right now. Our team will email you the details.",
      position: { x: 860, y: 480 },
      actions: [
        { type: "set_attribute", attribute: "kyb.status", value: "rejected" },
        { type: "notify", template: "kyb_rejected", recipient: "applicant" },
      ],
    },
  ],
};

export const businessOnboardingV1: FlowDefinition = {
  ...businessOnboardingV2,
  stages: businessOnboardingV2.stages.map((stage) => ({
    ...stage,
    steps: stage.steps.map((step) => ({ ...step, fields: step.fields.filter((field) => field.id !== companyWebsite.id) })),
  })),
};
