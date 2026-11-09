import { Global, Module } from "@nestjs/common";
import { config } from "../config";
import { Database } from "./database";

@Global()
@Module({
  providers: [{ provide: Database, useFactory: () => new Database(config.databaseUrl) }],
  exports: [Database],
})
export class DatabaseModule {}
