-- Speaking PT · 회원가입 확장 필드 마이그레이션
-- Supabase SQL Editor에 붙여넣어 실행하세요.

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists birthdate date;
alter table public.profiles add column if not exists gender text;         -- male | female | other
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists phone_verified boolean not null default false;
