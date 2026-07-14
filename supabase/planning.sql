-- 딥테크 기술기획 스튜디오 · Supabase 스키마
-- Supabase 프로젝트 SQL Editor에 붙여넣어 실행하세요. (schema.sql 실행 이후)

-- planning_projects ----------------------------------------------------------
-- 기술기획 프로젝트: 단계별 입력(input)과 산출물(artifacts), 발표연습 기록(rehearsals)을
-- 하나의 행에 JSONB로 저장한다. (단일 사용자 소유, RLS로 보호)
create table if not exists public.planning_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '새 기술기획 프로젝트',
  step integer not null default 1,          -- 1~5 (5 = 사업계획서 완성)
  input jsonb not null default '{}'::jsonb,        -- PlanningInput
  artifacts jsonb not null default '{}'::jsonb,    -- PlanningArtifacts (ideas/architecture/differentiators/draft/plan)
  rehearsals jsonb not null default '[]'::jsonb,   -- RehearsalRecord[]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists planning_projects_user_idx
  on public.planning_projects (user_id, updated_at desc);

-- RLS ------------------------------------------------------------------------
alter table public.planning_projects enable row level security;

drop policy if exists "own planning projects" on public.planning_projects;
create policy "own planning projects" on public.planning_projects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
