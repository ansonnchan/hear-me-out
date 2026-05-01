-- Profiles
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  default_personality text default 'cotton',
  created_at timestamptz default now()
);

-- Sessions (one per vent)
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text,
  original_text text not null,
  created_at timestamptz default now()
);

-- Responses (one per personality per session)
create table public.responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade not null,
  personality text not null,
  content text not null,
  created_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.responses enable row level security;

create policy "Users can access own profile"
  on public.profiles for all
  using (auth.uid() = id);

create policy "Users can access own sessions"
  on public.sessions for all
  using (auth.uid() = user_id);

create policy "Users can access own responses"
  on public.responses for all
  using (
    session_id in (
      select id from public.sessions where user_id = auth.uid()
    )
  );

-- Auto-create profile on first sign-in
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

