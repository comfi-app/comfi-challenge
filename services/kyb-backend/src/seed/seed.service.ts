import { readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";
import type { FileRef, StepValues } from "@comfi/kyb-contracts";
import { ApplicantService } from "../applicant/applicant.service";
import { ApplicationsService } from "../applications/applications.service";
import { CompaniesService } from "../companies/companies.service";
import { Database } from "../db/database";
import type { DecisionInput } from "../engine/engine.service";
import { FlowsService } from "../flows/flows.service";
import { businessOnboardingV1, businessOnboardingV2 } from "./business-onboarding";

const seedFiles = join(__dirname, "../../db/seed/files");
const fixtures = join(__dirname, "../../../../fixtures");
const mimeTypes: Record<string, string> = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg" };

const consents: StepValues = { "consent.accuracy": true, "consent.verification": true, "consent.terms": true };

/** An applicant session on one company's run. */
interface Session {
  companyId: string;
  token: string;
}

/**
 * Demo data, created through the same services the API uses so every row is consistent.
 * After each action the company's history is moved back in time to spread it over the last weeks.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly db: Database,
    private readonly flows: FlowsService,
    private readonly companies: CompaniesService,
    private readonly applicant: ApplicantService,
    private readonly applications: ApplicationsService,
  ) {}

  async onApplicationBootstrap() {
    const { rows } = await this.db.query<{ count: number }>("select count(*)::int as count from flows");
    if (rows[0]!.count > 0) return;
    await this.seed();
    this.logger.log("Seeded demo data");
  }

  async seed() {
    const flow = await this.flows.create({ name: "Business onboarding", key: "business-onboarding" });
    await this.flows.saveDraft(flow.id, businessOnboardingV1);
    await this.flows.publish(flow.id);

    const desertRose = await this.start("Desert Rose Cosmetics Trading LLC", flow.id);
    await this.submit(desertRose, "step-personal-info", {
      "applicant.firstName": "Fatima",
      "applicant.lastName": "Al Mansoori",
      "applicant.dateOfBirth": "1986-03-14",
      "applicant.nationality": "United Arab Emirates",
      "applicant.role": "Owner",
    });
    await this.submit(desertRose, "step-contact-details", {
      "contact.email": "fatima@desertrosecosmetics.ae",
      "contact.phone": "+971 50 412 7789",
      "contact.address": "Office 1204, Al Attar Business Tower, Sheikh Zayed Road",
      "contact.city": "Dubai",
    });
    await this.submit(desertRose, "step-company-details", {
      "company.legalName": "Desert Rose Cosmetics Trading LLC",
      "company.licenceNumber": "CN-1123581",
      "company.issuingAuthority": "Dubai DET",
      "company.legalForm": "llc",
    });
    await this.submit(desertRose, "step-trade-licence", {
      "documents.tradeLicence": await this.upload(desertRose, join(seedFiles, "trade-licence-desert-rose.pdf")),
      ...consents,
    });
    await this.rewind(desertRose, "1 day 20 hours");
    await this.decide(desertRose, { kind: "approved", comment: "Licence and company details match." });
    await this.rewind(desertRose, "19 days 3 hours");

    const falcon = await this.start("Falcon Trading LLC", flow.id);
    await this.submit(falcon, "step-personal-info", {
      "applicant.firstName": "Rajesh",
      "applicant.lastName": "Menon",
      "applicant.dateOfBirth": "1979-11-02",
      "applicant.nationality": "India",
      "applicant.role": "Director",
    });
    await this.submit(falcon, "step-contact-details", {
      "contact.email": "rajesh.menon@falcontrading.ae",
      "contact.phone": "+971 55 238 1904",
      "contact.address": "Warehouse 7, Street 18, Al Quoz Industrial Area 3",
      "contact.city": "Dubai",
    });
    await this.submit(falcon, "step-company-details", {
      "company.legalName": "Falcon Trading LLC",
      "company.licenceNumber": "CN-4815162",
      "company.issuingAuthority": "Dubai DET",
      "company.legalForm": "llc",
    });
    await this.submit(falcon, "step-trade-licence", {
      "documents.tradeLicence": await this.upload(falcon, join(fixtures, "trade-licence-falcon-trading.pdf")),
      ...consents,
    });
    await this.rewind(falcon, "13 days 2 hours");

    await this.flows.saveDraft(flow.id, businessOnboardingV2);
    await this.flows.publish(flow.id);

    const blueLagoon = await this.start("Blue Lagoon Tourism LLC", flow.id);
    await this.submit(blueLagoon, "step-personal-info", {
      "applicant.firstName": "Omar",
      "applicant.lastName": "Haddad",
      "applicant.dateOfBirth": "1990-06-21",
      "applicant.nationality": "Egypt",
      "applicant.role": "Authorised signatory",
    });
    await this.submit(blueLagoon, "step-contact-details", {
      "contact.email": "omar.haddad@bluelagoontourism.ae",
      "contact.phone": "+971 50 776 0312",
      "contact.address": "Office 305, Al Bateen Tower, Corniche Road West",
      "contact.city": "Abu Dhabi",
    });
    await this.submit(blueLagoon, "step-company-details", {
      "company.legalName": "Blue Lagoon Tourism LLC",
      "company.licenceNumber": "CN-2209871",
      "company.issuingAuthority": "Abu Dhabi ADDED",
      "company.legalForm": "llc",
      "company.website": "https://bluelagoontourism.ae",
    });
    await this.submit(blueLagoon, "step-trade-licence", {
      "documents.tradeLicence": await this.upload(blueLagoon, join(fixtures, "trade-licence-photo-blurry.png")),
      ...consents,
    });
    await this.rewind(blueLagoon, "22 hours");
    await this.decide(blueLagoon, {
      kind: "returned",
      comment: "The trade licence photo is blurry and cut off. Please upload a clear PDF copy.",
    });
    await this.rewind(blueLagoon, "7 days 4 hours");

    const oasis = await this.start("Oasis Logistics FZE", flow.id);
    await this.submit(oasis, "step-personal-info", {
      "applicant.firstName": "Priya",
      "applicant.lastName": "Sharma",
      "applicant.dateOfBirth": "1988-09-05",
      "applicant.nationality": "India",
      "applicant.role": "Director",
    });
    await this.submit(oasis, "step-contact-details", {
      "contact.email": "priya.sharma@oasislogistics.ae",
      "contact.phone": "+971 52 781 4420",
      "contact.address": "Warehouse LB07, Jebel Ali Free Zone South",
      "contact.city": "Dubai",
    });
    await this.submit(oasis, "step-company-details", {
      "company.legalName": "Oasis Logistics FZE",
      "company.licenceNumber": "CN-2718281",
      "company.issuingAuthority": "JAFZA",
      "company.legalForm": "free_zone_establishment",
      "company.website": "",
    });
    await this.rewind(oasis, "4 days 6 hours");

    const alNoor = await this.start("Al Noor Electronics Trading - Branch", flow.id);
    await this.submit(alNoor, "step-personal-info", {
      "applicant.firstName": "Imran",
      "applicant.lastName": "Qureshi",
      "applicant.dateOfBirth": "1982-01-17",
      "applicant.nationality": "Pakistan",
      "applicant.role": "Authorised signatory",
    });
    await this.submit(alNoor, "step-contact-details", {
      "contact.email": "imran.qureshi@alnoorelectronics.ae",
      "contact.phone": "+971 56 903 2215",
      "contact.address": "Shop 14, Al Arouba Street, Rolla",
      "contact.city": "Sharjah",
    });
    await this.submit(alNoor, "step-company-details", {
      "company.legalName": "Al Noor Electronics Trading - Branch",
      "company.licenceNumber": "CN-3141592",
      "company.issuingAuthority": "Sharjah SEDD",
      "company.legalForm": "branch",
      "company.website": "https://alnoorelectronics.ae",
    });
    await this.submit(alNoor, "step-trade-licence", {
      "documents.tradeLicence": await this.upload(alNoor, join(seedFiles, "trade-licence-al-noor.pdf")),
      ...consents,
    });
    await this.rewind(alNoor, "1 day 3 hours");
    await this.decide(alNoor, { kind: "approved", comment: "Branch licence verified." });
    await this.rewind(alNoor, "1 day 5 hours");

    const palmBay = await this.start("Palm Bay Foodstuff Trading", flow.id);
    await this.rewind(palmBay, "3 hours");

    await this.db.query(
      `update flows set created_at = now() - interval '26 days', updated_at = now() - interval '12 days'
       where id = $1`,
      [flow.id],
    );
    await this.db.query(
      `update flow_versions
       set published_at = now() - case version when 1 then interval '25 days' else interval '12 days' end
       where flow_id = $1`,
      [flow.id],
    );
  }

  private async start(name: string, flowId: string): Promise<Session> {
    const company = await this.companies.create(name, flowId);
    const session = { companyId: company.id, token: company.runs[0]!.linkToken };
    await this.rewind(session, "6 minutes");
    return session;
  }

  private async submit(session: Session, stepId: string, values: StepValues) {
    const view = await this.applicant.view(session.token);
    await this.applicant.submitStep(session.token, view.currentApplicationId!, stepId, values);
    await this.rewind(session, "4 minutes");
  }

  private async upload(session: Session, path: string): Promise<FileRef> {
    const ref = await this.applicant.upload(session.token, {
      fileName: basename(path),
      mimeType: mimeTypes[extname(path)] ?? "application/octet-stream",
      content: await readFile(path),
    });
    await this.rewind(session, "1 minute");
    return ref;
  }

  private async decide(session: Session, decision: DecisionInput) {
    const view = await this.applicant.view(session.token);
    await this.applications.decide(view.currentApplicationId!, decision);
  }

  /** Moves everything recorded for the company so far back by `interval`. */
  private async rewind({ companyId }: Session, interval: string) {
    await this.db.transaction(async (tx) => {
      const params = [companyId, interval];
      await tx.query("update companies set created_at = created_at - $2::interval where id = $1", params);
      await tx.query(
        `update flow_runs set created_at = created_at - $2::interval, updated_at = updated_at - $2::interval
         where company_id = $1`,
        params,
      );
      await tx.query(
        `update applications a
         set created_at = a.created_at - $2::interval, updated_at = a.updated_at - $2::interval,
             submitted_at = a.submitted_at - $2::interval, decided_at = a.decided_at - $2::interval
         from flow_runs r where r.id = a.run_id and r.company_id = $1`,
        params,
      );
      await tx.query(
        `update application_steps s set submitted_at = s.submitted_at - $2::interval
         from applications a join flow_runs r on r.id = a.run_id
         where a.id = s.application_id and r.company_id = $1`,
        params,
      );
      await tx.query("update files set created_at = created_at - $2::interval where company_id = $1", params);
      await tx.query("update events set created_at = created_at - $2::interval where company_id = $1", params);
    });
  }
}
