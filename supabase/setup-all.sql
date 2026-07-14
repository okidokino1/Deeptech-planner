-- ═══════════════════════════════════════════════════════════════════════
-- 딥테크 플래너 · Supabase 전체 설정 (한 번에 실행)
-- 새 Supabase 프로젝트의 SQL Editor에 그대로 붙여넣고 RUN 하세요.
-- profiles(회원) · payments(결제) · planning_projects(기술기획) + RLS + 가입 트리거
-- ═══════════════════════════════════════════════════════════════════════

-- 1) profiles (회원) --------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  plan text not null default 'free',       -- 'free' | 'pro'
  credits integer not null default 1,       -- 가입 시 무료 1건
  target_score text,
  phone text,
  birthdate date,
  gender text,                              -- male | female | other
  address text,
  phone_verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2) payments (결제) --------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id text not null,
  amount integer not null,
  status text not null,                     -- 'paid' | 'failed'
  provider text,                            -- 'portone' | 'demo'
  paid_at timestamptz not null default now()
);

-- 3) planning_projects (기술기획 프로젝트) ---------------------------------
create table if not exists public.planning_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '새 기술기획 프로젝트',
  step integer not null default 1,          -- 1~5 (5 = 사업계획서 완성)
  input jsonb not null default '{}'::jsonb,
  artifacts jsonb not null default '{}'::jsonb,
  rehearsals jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists planning_projects_user_idx
  on public.planning_projects (user_id, updated_at desc);

-- 4) RLS (본인 데이터만 접근) ----------------------------------------------
alter table public.profiles          enable row level security;
alter table public.payments          enable row level security;
alter table public.planning_projects enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own payments" on public.payments;
create policy "own payments" on public.payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own planning projects" on public.planning_projects;
create policy "own planning projects" on public.planning_projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5) 신규 가입 시 profiles 자동 생성 --------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
