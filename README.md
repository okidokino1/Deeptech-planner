# 딥테크 플래너 · AI 기술기획 · 사업계획서

딥테크(첨단기술) **정부지원사업(5억원+)** 을 겨냥해, **기술기획 → 사업계획서 완성(Word) → 발표(PT) 연습**을
한 흐름으로 자동화하는 웹 서비스입니다.

## 핵심 기능
1. **기술기획 5단계 마법사** — 사업 소개·문제점 입력 → AI가 ① 딥테크 아이디어 5개 → ② 시스템 아키텍처(4계층·모듈별 상세) → ③ 차별화·핵심 IP → ④ 연구개발 기획 초안을 순차 생성
2. **사업계획서 자동 완성** — 모듈별 요약표·과제명 후보·연구개발 필요성·운영 흐름·모듈별 상세·사업화 전략까지 정부 R&D 양식으로 완성, **Word(.docx) 내보내기**
3. **발표(PT) 연습** — 발표를 녹음하면 전달력·구성·내용·설득력·명료성 5개 영역 채점 + **심사위원 예상 질문(Q&A)** 제시
4. **회원·결제** — Supabase 인증 + PortOne 국내 결제(이용권/구독) + 이용권(크레딧) 차감

## 데모 모드
API 키가 하나도 없어도 **전체 기능이 즉시 동작**합니다(입력 기반 데모 생성 + 데모 로그인).
키를 연결하면 실제 서비스로 자동 전환됩니다.

## 빠른 시작 (로컬)
```bash
npm install
npm run dev      # http://localhost:3000
```
키 없이도 로그인·기획·계획서·발표연습을 모두 체험할 수 있습니다.

## 실제 서비스 연결
`.env.example`를 `.env.local`로 복사하고 키를 채우면 각 기능이 자동 전환됩니다.

| 기능 | 환경변수 | 발급처 |
|---|---|---|
| 계정·DB·저장 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | supabase.com |
| AI 기획·작성·채점 | `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` | console.anthropic.com |
| 발표 음성 전사(STT) | `OPENAI_API_KEY` | platform.openai.com |
| 결제 | `NEXT_PUBLIC_PORTONE_STORE_ID`, `NEXT_PUBLIC_PORTONE_CHANNEL_KEY`, `PORTONE_API_SECRET` | portone.io |

> 이 앱은 **Speaking PT와 독립된 별도 서비스**입니다. 회원·데이터를 완전히 분리하려면
> **자체 Supabase 프로젝트**와 **자체 PortOne 채널**을 새로 만들어 연결하세요.

### Supabase 설정
1. 새 프로젝트 생성 → SQL Editor에서 **`supabase/schema.sql` 실행**(profiles·payments·RLS·가입 트리거)
2. **`supabase/planning.sql` 실행**(기술기획 `planning_projects` 테이블) ← 필수
3. Authentication → Email 로그인 활성화

## 배포
자세한 단계는 [DEPLOY.md](DEPLOY.md) 참고. (GitHub → Vercel Import, 환경변수 등록, 재배포)

## 기술 스택
Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase · Anthropic Claude ·
OpenAI Whisper · PortOne · docx

## 구조
```
src/
  app/
    page.tsx                 # 랜딩
    (app)/dashboard          # 프로젝트 개요
    (app)/studio             # 기술기획 스튜디오 (목록/마법사/계획서/발표연습)
    api/planning             # 생성·저장·docx 내보내기
    api/rehearsal            # 발표 채점
    api/{auth,otp,payments,webhooks,transcribe}
  components/planning        # 마법사·계획서뷰·발표연습 UI
  lib/
    planning.ts              # 기획 생성 엔진 (Claude/데모)
    rehearsal.ts             # 발표 채점 엔진
    planningStore.ts         # 프로젝트 저장 (Supabase/데모)
    planningDocx.ts          # 사업계획서 → Word(.docx)
    {auth,env,credits,payments,plans,sms,metrics,utils}.ts
supabase/{schema,planning,signup-fields}.sql
```

© 2026 딥테크 플래너
