-- AI Speaking PT · Supabase 스키마
-- Supabase 프로젝트 SQL Editor에 붙여넣어 실행하세요.

-- 1) profiles ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  plan text not null default 'free',       -- 'free' | 'pro'
  credits integer not null default 1,      -- 회원가입 시 무료 1세트
  target_score text,
  created_at timestamptz not null default now()
);

-- 2) attempts ---------------------------------------------------------------
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_type text not null,                 -- 'ielts' | 'toefl' | 'toeic' | 'opic'
  created_at timestamptz not null default now()
);

-- 3) scores -----------------------------------------------------------------
create table if not exists public.scores (
  attempt_id uuid primary key references public.attempts(id) on delete cascade,
  pronunciation integer,
  fluency integer,
  vocabulary integer,
  grammar integer,
  logic integer,
  overall integer,
  native_headline text,
  native_level text,
  dimensions jsonb,
  result jsonb                             -- 전체 ScoreResult (문항별 첨삭 포함)
);

-- 4) payments ---------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id text not null,
  amount integer not null,
  status text not null,                    -- 'paid' | 'failed'
  provider text,                           -- 'portone' | 'demo'
  paid_at timestamptz not null default now()
);

-- RLS -----------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.attempts enable row level security;
alter table public.scores   enable row level security;
alter table public.payments enable row level security;

create policy "own profile"  on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own attempts" on public.attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own scores"   on public.scores   for all
  using (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid()));
create policy "own payments" on public.payments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 신규 가입 시 profiles 자동 생성 트리거 -------------------------------------
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

-- Storage 버킷(음성) : 대시보드 > Storage에서 'answers' 버킷 생성 후 정책 설정 권장
