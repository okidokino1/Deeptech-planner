-- 딥테크 플래너 · 요금제(plans) 테이블 + 기본 3개 시드
-- Supabase SQL Editor에 붙여넣어 실행하세요. (setup-all.sql 이후)

create table if not exists public.plans (
  id text primary key,                      -- 'free' | 'credit10' | 'pro' | 커스텀 슬러그(언더바 금지)
  name text not null,
  price integer not null default 0,          -- KRW
  period text not null default '',
  kind text not null default 'credit',       -- free | credit | subscription
  credits integer not null default 0,        -- 지급 이용권 (subscription은 무제한)
  features jsonb not null default '[]'::jsonb,
  highlight boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 요금제는 로그아웃 사용자도 보는 공개 정보. 읽기는 공개, 쓰기는 service_role만.
alter table public.plans enable row level security;
drop policy if exists "public read plans" on public.plans;
create policy "public read plans" on public.plans for select using (true);

-- 기본 3개 플랜 시드 (이미 있으면 유지)
insert into public.plans (id, name, price, period, kind, credits, features, highlight, sort_order, active) values
  ('free',     '무료 체험',   0,     '가입 시', 'free',         1,    '["사업계획서 1건 무료 완성","기술기획 마법사 전체","발표연습 1회","Word(.docx) 내보내기"]'::jsonb, false, 0, true),
  ('credit10', '이용권 10회', 49000, '1회 결제', 'credit',       10,   '["계획서 완성·발표 채점 10회","AI 정밀 기획·작성","차별화·핵심 IP 도출","유효기간 없음"]'::jsonb,       true,  1, true),
  ('pro',      'Pro 무제한',  99000, '월 구독',  'subscription', 9999, '["계획서 완성·발표 채점 무제한","프로젝트 무제한 관리","예상 Q&A 코칭","우선 지원"]'::jsonb,           false, 2, true)
on conflict (id) do nothing;
