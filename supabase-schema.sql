create table if not exists public.daily_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  calories numeric(10, 2) not null default 0 check (calories >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date)
);

alter table public.daily_logs enable row level security;

drop policy if exists "Users can read their own daily logs" on public.daily_logs;
create policy "Users can read their own daily logs"
  on public.daily_logs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own daily logs" on public.daily_logs;
create policy "Users can insert their own daily logs"
  on public.daily_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own daily logs" on public.daily_logs;
create policy "Users can update their own daily logs"
  on public.daily_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
