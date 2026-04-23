# Expo + Supabase (Web/Android/iOS)

- Expo SDK 55 (managed) + React Native Web + Supabase JS v2.
- 로그인/권한 + 시즌 운영 + 통합 캘린더(월간뷰) 기반 일정 관리 앱.

## 필수 참고 문서
- 작업 전에 반드시 `README.md`와 `docs` 폴더를 함께 확인하세요.
- 인증/회원가입 흐름은 `docs/auth-flow.md`를 기준으로 유지하세요.
- 관리자 메뉴 권한 기준은 `docs/admin-permissions.md`를 기준으로 정리하세요.
- 캘린더/경기/공휴일 스펙은 `docs/calendar-event-planning.md`를 기준으로 유지하세요.

## 1) 환경 변수
복사 후 값 채우기:

```bash
cp .env.example .env
```

- `EXPO_PUBLIC_SUPABASE_URL`: 프로젝트 API URL (https://*.supabase.co)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: anon public key

## 2) 의존성 설치
Node 20.19+ 권장. (SDK 55 기준)

```bash
npm install
```

## 3) 실행
- 개발: `npm run start` (웹/ios/android 선택)
- 웹 전용: `npm run web`
- iOS: `npm run ios`
- Android: `npm run android`
- 정적 점검: `npm run lint`

## 4) 현재 핵심 기능
- Supabase Auth 기반 로그인/회원가입
- 역할 기반 관리자 화면 접근 제어 (`member`, `admin`, `super_admin`)
- 회원 관리: 프로필 이미지 표시 + 소프트 삭제(`profiles.is_deleted`)
- 시즌 기반 팀/경기 관리 (`seasons`, `season_teams`, `matches`)
- 공지사항 업로드/조회 (`notices`, `notice-files`)
- 모바일 푸시 토큰 등록 (`push_tokens`)
- 통합 캘린더 월간뷰(기획 기준)
  - 공휴일(`holiday`)
  - 회원 개인 일정: 휴가(`leave`), 출장(`business_trip`), 기타(`personal`)
  - 경기 일정(`match`)

## 5) 캘린더/경기 등록 기준
통합 일정은 `calendar_events` 기준으로 조회하며, 경기 데이터는 `matches`를 원본으로 유지합니다.

- 팀명 표기 기준(고정):
  - 모든 화면(Home/통합 캘린더/시즌 운영/경기표)에서 팀명은 **Teams(`teams`) 테이블의 `name` 필드**를 사용합니다.
  - `1팀`, `2팀` 같은 임시 라벨은 팀명 표기에 사용하지 않습니다.

- 캘린더 이벤트 공통 필드
  - `title`
  - `start_at`, `end_at`
  - `is_all_day`
  - `event_type` (`holiday | leave | business_trip | personal | match`)

- 경기 등록 필수값
  - 장소: `3F` 또는 `4F`
  - 시간: 시작/종료 시간
  - 팀 구성 표기: `클럽A vs 클럽B` 형식으로 캘린더 카드에 노출 (팀원 정보는 별도 상세에서 확인)

## 6) 한국 공휴일 정책
- 한국 공휴일은 자동 동기화를 기본으로 운영합니다.
- 데이터 소스: Nager.Date (KR, 연도 단위)
- 운영 정책:
  - 동기화 실행: 관리자
  - 수동 보정/삭제: 관리자
  - 일반 회원: 조회만 가능

## 7) 빌드/배포
- 모바일: Expo EAS (`eas build --platform ios|android`, `eas submit ...`)
- 웹: `npx expo export --platform web` 결과를 정적 호스팅(Vercel, Cloudflare Pages 등)에 업로드

## 8) 보안/운영 메모
- `.env` 파일은 커밋하지 않습니다.
- 쓰기 권한은 UI 숨김만으로 처리하지 않고 RLS로 차단합니다.
- 개인 일정은 본인 생성/수정/삭제를 기본으로 하고, 관리자는 운영 목적의 관리 권한을 가집니다.

## 9) Supabase MCP 연결 오류 대응
`OAuth token refresh failed: Failed to parse server response`가 나오면 OAuth 갱신 대신 Bearer 토큰 방식으로 연결하세요.

1. Supabase Dashboard에서 Personal Access Token(PAT)을 발급합니다.
2. Codex를 실행하는 셸에 토큰을 설정합니다.

```bash
export SUPABASE_ACCESS_TOKEN="<your_supabase_pat>"
```

3. 이 저장소의 `.mcp.json`은 이미 아래 방식으로 설정되어 있습니다.
- `url`: `https://mcp.supabase.com/mcp?project_ref=...`
- `bearer_token_env_var`: `SUPABASE_ACCESS_TOKEN`
4. Codex를 재시작하고 `/mcp`로 `supabase` 상태를 확인합니다.
