-- 이용권(크레딧) 수동 조정 이력
-- 관리자가 CRM에서 회원 이용권을 지급/차감할 때마다 한 줄씩 기록한다.
-- (누가·언제·왜 조정했는지 추적 — 환불/보상 분쟁 대비)
--
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요.

create table if not exists public.credit_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,                   -- 증감량 (+지급 / -차감)
  before_credits integer not null,          -- 조정 전 잔여
  after_credits integer not null,           -- 조정 후 잔여
  reason text,                              -- 사유 (예: 생성 실패 보상)
  actor_id uuid,                            -- 조정한 관리자
  actor_email text,                         -- 조정 당시 관리자 이메일(스냅샷)
  created_at timestamptz not null default now()
);

create index if not exists credit_adjustments_user_idx
  on public.credit_adjustments (user_id, created_at desc);

-- RLS 켜고 정책은 만들지 않는다.
-- => 일반 사용자(anon/authenticated)는 전혀 접근 불가.
--    CRM 서버가 service_role 키로만 읽고 쓴다. (service_role 은 RLS 우회)
alter table public.credit_adjustments enable row level security;
