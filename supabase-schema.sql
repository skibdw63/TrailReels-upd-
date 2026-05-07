create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  username text unique,
  display_name text,
  bio text default '',
  role text default 'user' check (role in ('user','reeler','moderator','admin','owner')),
  creator_type text default 'none',
  created_at timestamptz default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  caption text default '',
  video_url text not null,
  type text default 'reel' check (type in ('reel','trail','premiere','live')),
  echoes int default 0,
  created_at timestamptz default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null,
  target_id text not null,
  reason text not null,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete set null,
  post_id uuid references public.posts(id) on delete cascade,
  gift_name text not null,
  message text default '',
  echoes_spent int default 0,
  created_at timestamptz default now()
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text default '⭐',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.reports enable row level security;
alter table public.follows enable row level security;
alter table public.gifts enable row level security;
alter table public.badges enable row level security;

drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select using (true);

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "posts readable" on public.posts;
create policy "posts readable" on public.posts for select using (true);

drop policy if exists "insert own posts" on public.posts;
create policy "insert own posts" on public.posts for insert with check (auth.uid() = author_id);

drop policy if exists "update own posts" on public.posts;
create policy "update own posts" on public.posts for update using (auth.uid() = author_id);

drop policy if exists "reports insert" on public.reports;
create policy "reports insert" on public.reports for insert with check (auth.uid() = reporter_id);

drop policy if exists "reports owner read all" on public.reports;
create policy "reports owner read all" on public.reports for select using (
  exists(select 1 from public.profiles where id = auth.uid() and role in ('owner','admin','moderator'))
);

drop policy if exists "follows readable" on public.follows;
create policy "follows readable" on public.follows for select using (true);

drop policy if exists "follow insert" on public.follows;
create policy "follow insert" on public.follows for insert with check (auth.uid() = follower_id);

drop policy if exists "follow delete" on public.follows;
create policy "follow delete" on public.follows for delete using (auth.uid() = follower_id);

drop policy if exists "gifts readable" on public.gifts;
create policy "gifts readable" on public.gifts for select using (true);

drop policy if exists "gifts insert" on public.gifts;
create policy "gifts insert" on public.gifts for insert with check (auth.uid() = sender_id);

drop policy if exists "badges readable" on public.badges;
create policy "badges readable" on public.badges for select using (true);

insert into public.badges(name, icon)
values ('Owner Crown','♛'),('Admin Hammer','🔨'),('Music Creator','♪'),('Archive Keeper','▣')
on conflict do nothing;

-- Optional sample posts are created inside the app in demo mode.
