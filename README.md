# Comfi Challenge

A small version of Comfi's business onboarding (KYB) platform: a configurable onboarding flow, the screens operators use to manage it, and the form applicants fill in.

## Requirements

- Node.js 22.12+
- pnpm 10
- Docker (runs Postgres)

## Getting started

```sh
pnpm install
pnpm dev
```

`pnpm dev` starts Postgres in Docker and runs all apps and services in watch mode. On first start the database is seeded with demo data.

## URLs

| What | URL |
|---|---|
| Operations (admin) | http://localhost:5173 |
| Applicant onboarding | http://localhost:5174 (open a link from a company page, e.g. `/r/<token>`) |
| KYB API | http://localhost:4000 |
| Risk API | http://localhost:4100 |
| Risk API docs | http://localhost:4100/docs |
| Postgres | `postgres://comfi:comfi@localhost:55432/kyb` |

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Start Postgres and everything else in watch mode |
| `pnpm db:reset` | Drop the database, run migrations and seed demo data again |
| `pnpm typecheck` | Type-check every package |
| `pnpm test` | Run all tests (the KYB backend tests need Postgres running) |
| `pnpm --filter <package> <script>` | Run a script in one package, e.g. `pnpm --filter @comfi/kyb-backend test` |
| `docker compose down` | Stop Postgres (add `-v` to delete its data) |

## Repository layout

```
apps/
  shell/          Operations app: hosts the admin apps below behind one navigation
  constructor/    Flow constructor: design and publish onboarding flows
  applications/   Applications: review submitted applications
  companies/      Companies: company profiles, their onboarding runs and documents
  onboarding/     Applicant-facing onboarding form
services/
  kyb-backend/    KYB API: flows, onboarding runs, applications, companies, files
  risk-service/   Risk API sandbox: trade licence document checks
packages/
  kyb-contracts/  Shared types, request schemas and the typed KYB API client
  ui/             Comfi UI components and styles
fixtures/         Sample documents for trying things out
```

## Test data

- Every step of the onboarding form has a **Fill with test data** button.
- File fields can use the documents from `fixtures/` through **Use a sample document**.
- New companies can be created from **Companies → New company** in the Operations app.
