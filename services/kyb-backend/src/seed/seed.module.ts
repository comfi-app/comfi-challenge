import { Module } from "@nestjs/common";
import { ApplicantModule } from "../applicant/applicant.module";
import { ApplicationsModule } from "../applications/applications.module";
import { CompaniesModule } from "../companies/companies.module";
import { FlowsModule } from "../flows/flows.module";
import { SeedService } from "./seed.service";

@Module({
  imports: [FlowsModule, CompaniesModule, ApplicantModule, ApplicationsModule],
  providers: [SeedService],
})
export class SeedModule {}
