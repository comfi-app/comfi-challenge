import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Pool } from "pg";

const migrationsDir = join(__dirname, "../../db/migrations");

/** Applies pending `db/migrations/*.sql` files in name order, each in its own transaction. */
export async function migrate(pool: Pool): Promise<string[]> {
  await pool.query(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);
  const { rows } = await pool.query<{ name: string }>("select name from schema_migrations");
  const applied = new Set(rows.map((row) => row.name));
  const pending = (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql") && !applied.has(name)).sort();

  for (const name of pending) {
    const sql = await readFile(join(migrationsDir, name), "utf8");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations (name) values ($1)", [name]);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw new Error(`Migration ${name} failed`, { cause: error });
    } finally {
      client.release();
    }
  }
  return pending;
}
