# 딥테크 플래너 · 배포 가이드 (Vercel)

이 앱은 **Speaking PT와 독립된 별도 서비스**입니다. 로컬에서 데모 모드로 전 기능이 검증되었습니다.
아래 중 한 방법으로 라이브 URL을 만들 수 있습니다.

> **중요:** 회원·데이터를 완전히 분리하려면 **자체 Supabase 프로젝트**와 **자체 PortOne 채널**을
> 새로 만들어 연결하세요. (Speaking PT와 키를 공유하면 회원 DB가 섞입니다.)

## 방법 A. GitHub → Vercel (권장, 가장 안정적)

1) GitHub에 빈 저장소를 하나 만든 뒤, 이 폴더에서:
```bash
git remote add origin https://github.com/<계정>/<저장소>.git
git branch -M main
git push -u origin main
```
2) https://vercel.com → **Add New → Project → Import** 에서 방금 만든 저장소 선택
3) Framework는 **Next.js** 자동 감지 → **Deploy**
4) 배포 후 **Settings → Environment Variables**에 아래 키 등록 (없으면 데모 모드로 동작)
5) 재배포(Redeploy)

## 방법 B. Vercel CLI

```bash
npm i -g vercel
vercel            # 프리뷰 배포
vercel --prod     # 프로덕션 배포
```

## 환경변수 (Vercel Project Settings)

| 키 | 용도 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | 계정·DB |
| `OPENAI_API_KEY` | Whisper 음성 전사 |
| `ANTHROPIC_API_KEY` / `CLAUDE_MODEL` | Claude 채점 |
| `NEXT_PUBLIC_PORTONE_STORE_ID` / `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` / `PORTONE_API_SECRET` | 결제 |

## 배포 후 설정
- **Supabase**:
  - `supabase/schema.sql` 실행 → 이메일 로그인 활성화
  - `supabase/planning.sql` 실행 → **딥테크 기술기획 스튜디오**(`planning_projects` 테이블) 활성화
- **PortOne**: 콘솔에서 웹훅 URL을 `https://<도메인>/api/webhooks/portone` 로 등록
- 결제는 먼저 **테스트(샌드박스) 채널**로 검증 후 실채널로 전환 권장

## 딥테크 기술기획 스튜디오 (`/studio`)
- 정부 딥테크 지원사업용 **기술기획 → 사업계획서 완성(.docx 내보내기) → 발표(PT) 연습**을 한 흐름으로 제공.
- `ANTHROPIC_API_KEY` 연결 시 Claude가 아이디어·아키텍처·차별화·계획서·발표채점을 정밀 생성.
  키가 없으면 입력 기반 **데모 생성**으로 흐름이 그대로 동작.
- 발표연습 음성 전사는 `OPENAI_API_KEY`(Whisper) 연결 시 정밀, 없으면 브라우저 음성인식(ko-KR) 사용.
- 사업계획서 완성 1회 / 발표 채점 1회당 이용권(크레딧) 1회 차감(Pro 무제한) — 기존 결제/크레딧 로직 재사용.

## 참고
- 키를 하나도 넣지 않아도 **데모 모드**로 전체 기능(응시·채점·결제 UI)이 동작하므로,
  먼저 배포해 URL을 확보한 뒤 키를 순차적으로 연결하는 것을 권장합니다.
