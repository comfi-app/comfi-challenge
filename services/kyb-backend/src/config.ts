export const config = {
  databaseUrl: process.env.DATABASE_URL ?? "postgres://comfi:comfi@localhost:55432/kyb",
  port: Number(process.env.PORT ?? 4000),
};
