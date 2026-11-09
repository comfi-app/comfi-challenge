import type { FlowDefinition, StepValues } from "@comfi/kyb-contracts";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApplicantService } from "../src/applicant/applicant.service";
import { ApplicationsService } from "../src/applications/applications.service";
import { CompaniesService } from "../src/companies/companies.service";
import { config } from "../src/config";
import { Database } from "../src/db/database";
import { EngineService } from "../src/engine/engine.service";
import { EventsService } from "../src/events/events.service";
import { FlowsService } from "../src/flows/flows.service";
import { RunsService } from "../src/runs/runs.service";
import { businessOnboardingV1, businessOnboardingV2 } from "../src/seed/business-onboarding";

// Runs against a separate database so the dev data stays untouched.
const testDatabaseName = "kyb_test";
const testUrl = new URL(config.databaseUrl);
testUrl.pathname = `/${testDatabaseName}`;

async function resetTestDatabase() {
  const admin = new Pool({ connectionString: config.databaseUrl });
  const { rowCount } = await admin.query("select 1 from pg_database where datname = $1", [testDatabaseName]);
  if (rowCount === 0) await admin.query(`create database ${testDatabaseName}`);
  await admin.end();

  const pool = new Pool({ connectionString: testUrl.toString() });
  await pool.query("drop schema public cascade; create schema public");
  await pool.end();
}

const db = new Database(testUrl.toString());
const events = new EventsService(db);
const engine = new EngineService(events);
const runs = new RunsService(db);
const flows = new FlowsService(db);
const companies = new CompaniesService(db, engine, events, runs);
const applicant = new ApplicantService(db, engine);
const applications = new ApplicationsService(db, engine, events, runs);

const pdf = { fileName: "licence.pdf", mimeType: "application/pdf", content: Buffer.from("%PDF-1.4 test") };

const personalInfo: StepValues = {
  "applicant.firstName": "Layla",
  "applicant.lastName": "Nasser",
  "applicant.dateOfBirth": "1987-04-12",
  "applicant.nationality": "United Arab Emirates",
  "applicant.role": "Owner",
};
const contactDetails: StepValues = {
  "contact.email": "layla@example.ae",
  "contact.phone": "+971 50 123 4567",
  "contact.address": "Office 9, Al Wasl Road",
  "contact.city": "Dubai",
};
const companyDetails: StepValues = {
  "company.legalName": "Example Trading LLC",
  "company.licenceNumber": "CN-1000001",
  "company.issuingAuthority": "Dubai DET",
  "company.legalForm": "llc",
};

async function publish(definition: FlowDefinition, flowId: string) {
  await flows.saveDraft(flowId, definition);
  return flows.publish(flowId);
}

/** Creates a company with a run on the active version. */
async function startCompany(flowId: string, name = "Example Trading LLC") {
  const company = await companies.create(name, flowId);
  return { companyId: company.id, token: company.runs[0]!.linkToken };
}

async function submit(token: string, stepId: string, values: StepValues) {
  const view = await applicant.view(token);
  return applicant.submitStep(token, view.currentApplicationId!, stepId, values);
}

async function completeOnboarding(token: string, legalForm = "llc") {
  await submit(token, "step-personal-info", personalInfo);
  await submit(token, "step-contact-details", contactDetails);
  await submit(token, "step-company-details", { ...companyDetails, "company.legalForm": legalForm });
  const licence = await applicant.upload(token, pdf);
  return submit(token, "step-trade-licence", {
    "documents.tradeLicence": licence,
    "consent.accuracy": true,
    "consent.verification": true,
    "consent.terms": true,
  });
}

describe("engine", () => {
  let flowId: string;

  beforeAll(async () => {
    await resetTestDatabase();
    await db.onModuleInit();
    flowId = (await flows.create({ name: "Business onboarding", key: "business-onboarding" })).id;
    await publish(businessOnboardingV1, flowId);
  });

  afterAll(() => db.onModuleDestroy());

  it("takes an application from submission to an approved ending", async () => {
    const { companyId, token } = await startCompany(flowId);
    const view = await completeOnboarding(token);
    const [application] = view.applications;
    expect(application).toMatchObject({ status: "in_review", stageId: "stage-onboarding" });
    expect(application!.steps.every((step) => step.status === "submitted")).toBe(true);

    await expect(applications.decide(application!.id, { kind: "approved", comment: null })).resolves.toMatchObject({
      status: "approved",
      run: { status: "completed", outcome: "approved", endingId: "ending-approved" },
    });
    await expect(applications.decide(application!.id, { kind: "rejected", comment: null })).rejects.toThrow(
      "Only applications in review can be decided",
    );

    const company = await companies.get(companyId);
    expect(company.attributes).toMatchObject({ "company.legalForm": "llc", "kyb.status": "verified" });
    expect(company.files).toEqual([expect.objectContaining({ fieldKey: "documents.tradeLicence" })]);
    expect(company.timeline.map((event) => event.type).reverse()).toEqual([
      "run.started",
      "step.submitted",
      "step.submitted",
      "notification.queued",
      "step.submitted",
      "file.uploaded",
      "step.submitted",
      "application.submitted",
      "notification.queued",
      "application.approved",
      "run.completed",
      "attribute.set",
      "notification.queued",
    ]);
  });

  it("returns an application and accepts the corrected submission", async () => {
    const { token } = await startCompany(flowId);
    const [application] = (await completeOnboarding(token)).applications;
    await applications.decide(application!.id, { kind: "returned", comment: "Upload a clearer copy." });

    const licence = await applicant.upload(token, pdf);
    const view = await submit(token, "step-trade-licence", {
      "documents.tradeLicence": licence,
      "consent.accuracy": true,
      "consent.verification": true,
      "consent.terms": true,
    });
    expect(view.applications[0]).toMatchObject({ status: "in_review", decision: { kind: "returned" } });
  });

  it("routes branches through the parent company stage", async () => {
    const { token } = await startCompany(flowId, "Example Trading - Branch");
    const [onboarding] = (await completeOnboarding(token, "branch")).applications;
    await applications.decide(onboarding!.id, { kind: "approved", comment: null });

    const view = await applicant.view(token);
    expect(view.applications.map(({ stageId, status }) => ({ stageId, status }))).toEqual([
      { stageId: "stage-onboarding", status: "approved" },
      { stageId: "stage-parent-company", status: "in_progress" },
    ]);
    expect(view.currentApplicationId).toBe(view.applications[1]!.id);

    const certificate = await applicant.upload(token, pdf);
    const submitted = await submit(token, "step-parent-company-details", {
      "parent.legalName": "Example Holdings Ltd",
      "parent.country": "United Kingdom",
      "parent.registrationCertificate": certificate,
    });
    await applications.decide(submitted.currentApplicationId!, { kind: "rejected", comment: null });
    await expect(applicant.view(token)).resolves.toMatchObject({
      run: { status: "completed", outcome: "rejected" },
      ending: { id: "ending-rejected" },
    });
  });

  it("keeps a run on the version it started with", async () => {
    const pinned = await startCompany(flowId);
    await publish(businessOnboardingV2, flowId);
    const latest = await startCompany(flowId);

    const website = { ...companyDetails, "company.website": "https://example.ae" };
    await submit(pinned.token, "step-personal-info", personalInfo);
    await expect(submit(pinned.token, "step-company-details", website)).rejects.toMatchObject({
      body: { fieldErrors: { "company.website": "Unknown field" } },
    });
    await expect(submit(latest.token, "step-company-details", website)).resolves.toMatchObject({ flow: { version: 2 } });

    const view = await applicant.view(pinned.token);
    expect(view.flow.version).toBe(1);
    const flow = await flows.get(flowId);
    expect(flow.versions.map(({ version, isActive }) => ({ version, isActive }))).toEqual([
      { version: 2, isActive: true },
      { version: 1, isActive: false },
    ]);
  });
});
