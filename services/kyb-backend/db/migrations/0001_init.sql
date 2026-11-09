create table flows (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  draft jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table flow_versions (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references flows (id) on delete cascade,
  version integer not null check (version > 0),
  definition jsonb not null,
  published_at timestamptz not null default now(),
  is_active boolean not null default false,
  unique (flow_id, version)
);

create unique index flow_versions_one_active_per_flow on flow_versions (flow_id) where is_active;

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  attributes jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index companies_created_at_idx on companies (created_at desc);

create table flow_runs (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references flows (id),
  flow_version_id uuid not null references flow_versions (id),
  company_id uuid not null references companies (id) on delete cascade,
  status text not null check (status in ('active', 'completed', 'blocked')),
  outcome text check (outcome in ('approved', 'rejected')),
  ending_id text,
  link_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'completed') = (outcome is not null))
);

create index flow_runs_company_idx on flow_runs (company_id, created_at desc);
create unique index flow_runs_one_active_per_company on flow_runs (company_id) where status = 'active';
create index flow_runs_flow_idx on flow_runs (flow_id);
create index flow_runs_flow_version_idx on flow_runs (flow_version_id);

create table applications (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references flow_runs (id) on delete cascade,
  stage_id text not null,
  status text not null check (status in ('in_progress', 'in_review', 'returned', 'approved', 'rejected')),
  submitted_at timestamptz,
  decision_kind text check (decision_kind in ('approved', 'rejected', 'returned')),
  decision_comment text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((decision_kind is null) = (decided_at is null))
);

create index applications_run_idx on applications (run_id, created_at);
create index applications_updated_at_idx on applications (updated_at desc);
create index applications_status_idx on applications (status, updated_at desc);

create table application_steps (
  application_id uuid not null references applications (id) on delete cascade,
  step_id text not null,
  status text not null default 'pending' check (status in ('pending', 'submitted')),
  values jsonb not null default '{}',
  submitted_at timestamptz,
  primary key (application_id, step_id)
);

create table files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  run_id uuid not null references flow_runs (id) on delete cascade,
  application_id uuid references applications (id) on delete set null,
  field_key text,
  file_name text not null,
  mime_type text not null,
  size integer not null check (size >= 0),
  content bytea not null,
  created_at timestamptz not null default now()
);

create index files_company_idx on files (company_id, created_at desc);
create index files_run_idx on files (run_id);

create table events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  run_id uuid references flow_runs (id) on delete cascade,
  application_id uuid references applications (id) on delete cascade,
  type text not null check (type in (
    'run.started', 'run.routed', 'run.completed', 'run.blocked',
    'file.uploaded', 'step.submitted',
    'application.submitted', 'application.approved', 'application.rejected', 'application.returned',
    'attribute.set', 'notification.queued'
  )),
  actor text not null check (actor in ('applicant', 'operator', 'system')),
  payload jsonb not null default '{}',
  -- clock_timestamp() keeps events of one transaction in the order they were written
  created_at timestamptz not null default clock_timestamp()
);

create index events_company_idx on events (company_id, created_at);
create index events_run_idx on events (run_id, created_at);
