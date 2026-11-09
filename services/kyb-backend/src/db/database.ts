import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { migrate } from "./migrate";

/** Client of an open transaction. */
export type Tx = PoolClient;

export class Database implements OnModuleInit, OnModuleDestroy {
  readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async onModuleInit() {
    await migrate(this.pool);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  query<Row extends QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<Row>> {
    return this.pool.query<Row>(text, values);
  }

  async transaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const result = await work(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
}
