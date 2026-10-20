-- Run once in Supabase Dashboard > SQL Editor.
create table if not exists public.app_state (
  collection text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- The Node server accesses this table with the secret service role key.
-- Do not create anon/authenticated policies for this internal storage table.
create or replace function public.touch_app_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_state_updated_at on public.app_state;
create trigger app_state_updated_at
before update on public.app_state
for each row execute function public.touch_app_state_updated_at();
