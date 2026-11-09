import { Module } from "@nestjs/common";
import { EngineModule } from "../engine/engine.module";
import { EventsModule } from "../events/events.module";
import { RunsModule } from "../runs/runs.module";
import { CompaniesController } from "./companies.controller";
import { CompaniesService } from "./companies.service";

@Module({
  imports: [EngineModule, EventsModule, RunsModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
