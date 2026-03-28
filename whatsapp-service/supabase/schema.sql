-- GymFlow: single JSON snapshot (matches former database.json shape)
-- Backend uses service_role only — never expose service_role in browser or Vercel.

create table if not exists public.app_state (
  id bigint primary key default 1,
  constraint single_row check (id = 1),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Optional: allow authenticated read later; for now backend uses service role (bypasses RLS).
alter table public.app_state enable row level security;

-- No policies = anon/authenticated cannot read; service role still has full access.

comment on table public.app_state is 'Stores full app state as JSON (gyms, members, payments, logs, system).';
