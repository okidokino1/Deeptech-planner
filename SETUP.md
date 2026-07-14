# 딥테크 플래너 · 실서비스 전환 체크리스트

데모 모드 → 실서비스로 바꾸는 순서입니다. **⬜ 표시는 대표님이 직접 하셔야 하는 부분**입니다
(계정 생성·키 발급은 보안상 대신 해드릴 수 없습니다). 나머지 준비는 모두 완료되어 있습니다.

---

## 1. Supabase (회원·DB) — 필수
- ⬜ https://supabase.com 에서 **새 프로젝트** 생성 (Speaking PT와 분리하려면 반드시 새 프로젝트)
- ⬜ **SQL Editor** → `supabase/setup-all.sql` 전체 붙여넣기 → **RUN**
  (profiles·payments·planning_projects 테이블 + RLS + 가입 트리거가 한 번에 생성됩니다)
- ⬜ **Authentication → Providers → Email** 활성화
- ⬜ **Project Settings → API** 에서 아래 3개 값 복사:
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`  (비공개!)

## 2. Anthropic Claude (AI 생성) — 필수(품질)
- ⬜ https://console.anthropic.com → **API Keys** 발급 → `ANTHROPIC_API_KEY`
- 품질 최우선이면 `.env`에서 `CLAUDE_MODEL=claude-opus-4-8` 로 설정 (기본은 비용 효율 모델)

## 3. OpenAI Whisper (발표 음성 전사) — 선택
- ⬜ https://platform.openai.com → API Key → `OPENAI_API_KEY`
  (없으면 발표연습은 브라우저 음성인식으로 동작)

## 4. PortOne (결제) — 유료화 시 필수
- ⬜ https://portone.io 가입 → 결제대행사(PG) 계약 → **채널** 생성
- ⬜ StoreID / ChannelKey / API Secret → `NEXT_PUBLIC_PORTONE_STORE_ID` 등에 입력
- ⬜ 콘솔에서 **웹훅 URL**을 `https://<배포도메인>/api/webhooks/portone` 로 등록
- 먼저 **테스트(샌드박스) 채널**로 검증 후 실채널 전환 권장

## 5. 키 입력
- **로컬 테스트:** 프로젝트 루트의 `.env.local` 파일에 위 값들을 붙여넣기 → `npm run dev`
- **배포(운영):** 아래 6번 Vercel의 **Environment Variables**에 동일하게 등록

## 6. 배포 (Vercel)
- ⬜ 이 폴더를 GitHub 저장소에 push (원격 주소 알려주시면 도와드립니다)
- ⬜ https://vercel.com → **Add New → Project → Import** → 저장소 선택 → Deploy
- ⬜ **Settings → Environment Variables** 에 1~4의 키 등록 → **Redeploy**
- ⬜ 도메인 연결 (선택)

---

### 참고
- 키를 하나도 안 넣으면 그대로 **데모 모드**(로그인·기획·계획서·발표연습 전부 체험 가능)로 배포됩니다.
  → 먼저 데모로 배포해 URL을 확보한 뒤, 키를 순차적으로 연결하는 방식을 권장합니다.
- 관리자(무제한 이용) 이메일은 `ADMIN_EMAILS` 로 지정합니다 (기본: okidokino1@gmail.com).
