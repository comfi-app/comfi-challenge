import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { EngineService } from "./engine.service";

@Module({ imports: [EventsModule], providers: [EngineService], exports: [EngineService] })
export class EngineModule {}
