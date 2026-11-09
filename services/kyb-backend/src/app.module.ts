import { Module } from "@nestjs/common";
import { ApplicantModule } from "./applicant/applicant.module";
import { ApplicationsModule } from "./applications/applications.module";
import { CompaniesModule } from "./companies/companies.module";
import { DatabaseModule } from "./db/database.module";
import { FilesModule } from "./files/files.module";
import { FlowsModule } from "./flows/flows.module";
import { SeedModule } from "./seed/seed.module";

@Module({
  imports: [DatabaseModule, FlowsModule, CompaniesModule, ApplicationsModule, ApplicantModule, FilesModule, SeedModule],
})
export class AppModule {}
