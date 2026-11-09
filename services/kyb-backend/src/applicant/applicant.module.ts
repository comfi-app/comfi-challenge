import { Module } from "@nestjs/common";
import { EngineModule } from "../engine/engine.module";
import { ApplicantController } from "./applicant.controller";
import { ApplicantService } from "./applicant.service";

@Module({
  imports: [EngineModule],
  controllers: [ApplicantController],
  providers: [ApplicantService],
  exports: [ApplicantService],
})
export class ApplicantModule {}
