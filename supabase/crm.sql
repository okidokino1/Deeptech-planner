-- Speaking PT · CRM 확장 마이그레이션
-- Supabase SQL Editor에 붙여넣어 실행하세요. (기존 schema.sql 실행 이후)

-- 1) 기관(조직) 테이블 ---------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text,
  contact_phone text,
  memo text,
  created_at timestamptz not null default now()
);

-- 2) profiles CRM 컬럼 추가 ----------------------------------------------------
alter table public.profiles add column if not exists org_id uuid references public.organizations(id) on delete set null;
alter table public.profiles add column if not exists role text not null default 'member';   -- member | org_admin | admin
alter table public.profiles add column if not exists memo text;
alter table public.profiles add column if not exists tags text[] not null default '{}';
alter table public.profiles add column if not exists status text not null default 'active';  -- active | dormant

-- 3) RLS: CRM 데이터는 서버(service_role)에서만 접근하므로 조직 테이블은 잠금 --
alter table public.organizations enable row level security;
-- (공개 정책 없음 → service_role만 접근. 앱 CRM은 service_role + 앱 레벨 권한 스코핑 사용)

-- 4) 조회 성능 인덱스 ----------------------------------------------------------
create index if not exists idx_profiles_org on public.profiles(org_id);
create index if not exists idx_attempts_user on public.attempts(user_id);
create index if not exists idx_payments_user on public.payments(user_id);
create index if not exists idx_payments_status on public.payments(status);

-- 완료. (관리자 계정은 앱의 ADMIN_EMAILS로 인식되며, profiles.role='admin'으로도 지정 가능)
