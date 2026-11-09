import { Module } from "@nestjs/common";
import { EngineModule } from "../engine/engine.module";
import { EventsModule } from "../events/events.module";
import { RunsModule } from "../runs/runs.module";
import { ApplicationsController } from "./applications.controller";
import { ApplicationsService } from "./applications.service";

@Module({
  imports: [EngineModule, EventsModule, RunsModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
