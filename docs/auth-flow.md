# 로그인 / 회원가입 프로세스

## 개요
현재 앱의 로그인과 회원가입은 Supabase Auth를 기준으로 동작합니다. 화면 로직은 [`App.tsx`](/Users/jungalima/Documents/Playground/App.tsx), Supabase 클라이언트 설정은 [`src/lib/supabase.ts`](/Users/jungalima/Documents/Playground/src/lib/supabase.ts)에 있습니다.

## 환경 변수
웹과 앱 공통으로 아래 값이 필요합니다.

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

앱은 `process.env.EXPO_PUBLIC_*` 값을 우선 사용하고, 없으면 Expo `extra` 값을 fallback으로 사용합니다.

## 로그인 프로세스
1. 사용자가 이메일과 비밀번호를 입력합니다.
2. 값이 비어 있으면 커스텀 모달로 안내합니다.
3. `supabase.auth.signInWithPassword({ email, password })`를 호출합니다.
4. 성공하면 `session` 상태가 갱신되고 `profiles`를 조회합니다.
   - 기본 조회 항목: `name`, `gender`, `role`, `status`, `department`
   - 레거시 스키마(예: `profiles.status` 컬럼 미존재)에서는 `status` 없이 재조회하고 `status='active'`로 간주합니다.
5. `profiles.status`를 확인합니다.
   - `active`: 홈 화면으로 이동합니다.
   - `inactive`: 차단 안내를 표시하고 세션을 종료한 뒤 로그인 화면에 유지합니다.
6. `active` 사용자만 홈 화면에서 역할별 UI를 적용합니다.
   - 관리자 계정도 기본 진입은 홈입니다.
   - 관리자 기능 진입은 홈 상단의 톱니 버튼으로만 처리합니다.
7. 실패하면 Supabase 에러 메시지를 한국어로 변환해 모달로 보여줍니다.
8. 세션이 이미 있으면 앱 시작 시 자동으로 복원하고, 동일하게 `profiles.status` 확인 후 화면 진입 여부를 결정합니다.

## 회원가입 프로세스
1. 사용자는 이름, 성별, 이메일, 비밀번호를 입력합니다.
2. 필수값 누락 시 어떤 항목이 비었는지 모달로 표시합니다.
3. 이메일 형식을 검사합니다.
   - `example.com` 같은 예시 도메인은 사전 차단합니다.
4. 비밀번호는 최소 6자 이상인지 검사합니다.
5. `supabase.auth.signUp()`를 호출하며 `name`, `gender`를 `raw_user_meta_data`로 함께 전달합니다.
6. 성공 시 `가입 완료 / 이메일 인증 후 로그인하세요` 모달을 띄우고 로그인 화면으로 돌아갑니다.

## profiles 저장 방식
클라이언트에서 회원가입 직후 `profiles`를 직접 저장하면 RLS에 걸릴 수 있습니다. 그래서 현재는 DB 트리거로 처리합니다.

- 트리거 SQL: [`20260408_profiles_trigger.sql`](/Users/jungalima/Documents/Playground/supabase/migrations/20260408_profiles_trigger.sql)
- 동작: `auth.users`에 새 사용자가 생성되면 `public.profiles`에 `id`, `name`, `gender`를 자동 생성 또는 업데이트합니다.

즉, 회원가입 시 저장 순서는 아래와 같습니다.

1. 앱에서 `signUp`
2. Supabase Auth가 `auth.users` 생성
3. DB 트리거가 `public.profiles` 자동 생성

## 현재 에러 처리
다음 에러는 사용자 친화적인 한국어 메시지로 변환합니다.

- 잘못된 이메일 형식
- 이메일 발송 한도 초과
- 이미 가입된 이메일
- 비밀번호 관련 오류

모든 안내는 브라우저 기본 alert가 아니라 앱 내부 커스텀 모달로 표시합니다.

## 로그인 후 데이터 로딩
로그인 또는 세션 복원 후 아래 데이터를 Supabase에서 조회합니다.

- `profiles`: 현재 사용자 이름/성별/역할/회원상태/부서(`name`, `gender`, `role`, `status`, `department`)
  - `status` 컬럼이 없는 DB에서는 앱이 자동 fallback으로 `active`를 사용합니다.
- `seasons`: 시즌 목록과 현재 활성 시즌
- `matches`: 활성 시즌 기준 경기 일정과 결과
- `teams`: 활성 시즌 기준 팀 목록과 인원 수
- `league_table`: 활성 시즌 기준 리그 순위
- `notices`: 공지 목록

공지 파일 업로드는 Supabase Storage `notice-files` 버킷을 사용합니다.

모바일 푸시 등록은 세션 복원 또는 로그인 성공 직후 함께 시도합니다.

- 웹은 제외합니다.
- iOS/Android 실제 디바이스에서만 Expo Push Token 발급을 시도합니다.
- 권한 허용 시 `public.push_tokens`에 `user_id`, `token`, `platform`을 upsert 합니다.
- 권한 거부, 실기기 아님, `eas.projectId` 누락, 저장 실패 상태는 홈 화면에서 바로 확인할 수 있게 유지합니다.

## 로그인 후 화면 동작
- 세션이 복원되거나 로그인에 성공하면 먼저 `profiles.status`를 검사합니다.
- `status` 컬럼이 없는 프로젝트에서는 `active`로 간주하고 차단 로직을 건너뜁니다.
- `profiles.status = inactive`이면 홈으로 진입시키지 않고 차단 안내 후 로그아웃 처리합니다.
- `profiles.status = active`인 경우 기본 진입 화면은 `home`입니다.
- `profiles.role`이 `admin` 또는 `super_admin`이면 홈 상단에 관리자 톱니 아이콘을 노출합니다.
- 톱니 아이콘을 눌렀을 때만 관리자 화면으로 진입합니다.
- `공지사항 관리`, `시즌 관리`, `회원 관리`는 관리자 대시보드 내부 폼이 아니라 각각 별도 관리자 페이지로 이동해 처리합니다.
- 일반 사용자 화면의 팀, 경기 일정, 경기 결과는 항상 현재 `active` 시즌 기준 데이터만 노출합니다.
- 권한 없는 사용자가 관리자 화면 상태로 직접 접근하면 홈으로 돌려보내는 방향으로 유지합니다.
- 홈 화면에는 푸시 상태 카드가 노출되며, 사용자는 여기서 토큰 등록 상태와 최근 수신 알림을 확인하고 필요 시 재등록 또는 시스템 설정 이동을 할 수 있습니다.
