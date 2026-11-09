import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Pool } from "pg";
import { AppModule } from "../app.module";
import { config } from "../config";

/** Drops all data, then boots the app once so it migrates and seeds the empty database. */
async function reset() {
  const pool = new Pool({ connectionString: config.databaseUrl });
  await pool.query("drop schema public cascade; create schema public");
  await pool.end();

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ["log", "error", "warn"] });
  await app.close();
}

reset().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
