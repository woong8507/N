# 로그인 / 회원가입 프로세스

## 개요
현재 앱의 로그인과 회원가입은 Supabase Auth를 기준으로 동작합니다.
화면 로직은 `App.tsx`, Supabase 클라이언트 설정은 `src/lib/supabase.ts`에 있습니다.

## 환경 변수
```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

앱은 `process.env.EXPO_PUBLIC_*` 값을 우선 사용하고, 없으면 Expo `extra` 값을 fallback으로 사용합니다.

## 로그인 프로세스
1. 사용자가 이메일과 비밀번호를 입력합니다.
2. 값이 비어 있으면 커스텀 모달로 안내합니다.
3. `supabase.auth.signInWithPassword({ email, password })`를 호출합니다.
4. 성공하면 `profiles`를 조회합니다.
5. `profiles.status`를 확인합니다.
- `active`: 홈 화면 진입
- `inactive`: 차단 안내 후 로그아웃 처리
6. `role`에 따라 관리자 UI 노출 여부를 분기합니다.
7. 세션 복원 시에도 동일한 체크를 적용합니다.

## 회원가입 프로세스
1. 이름, 성별, 이메일, 비밀번호 입력
2. 필수값/이메일 형식/비밀번호 길이 검증
3. `supabase.auth.signUp()` 호출
4. 성공 시 인증 안내 모달 표시 후 로그인 화면 복귀

## profiles 저장 방식
- 회원가입 직후 `profiles`는 DB 트리거로 생성/업데이트
- 클라이언트에서 직접 `profiles`를 먼저 쓰지 않음

## 로그인 후 데이터 로딩
로그인/세션 복원 후 기본 로딩:
- `profiles`: 사용자 상태/권한
- `seasons`: 시즌 목록 + active 시즌
- `calendar_events`: 통합 일정 조회 원본
- `matches`: 경기 원본/상세 데이터
- `teams`: active 시즌 팀 목록
- `league_table`: active 시즌 순위
- `notices`: 공지 목록

회원 관리 로딩 기준:
- `profiles` 조회 컬럼: `id`, `name`, `gender`, `role`, `status`, `department`, `auto_login`, `avatar_path`, `is_deleted`, `created_at`
- `is_deleted = true` 회원은 회원 관리 화면에서 노출하지 않음
- `avatar_path`는 Supabase Storage `profile_img` 버킷 파일명 또는 경로를 저장

핵심 변경:
- 일정 화면의 1차 조회는 `matches` 단독이 아니라 `calendar_events` 중심으로 처리
- `match` 이벤트는 `linked_match_id`를 통해 경기 원본과 연결
- 경기 팀명 표시는 항상 `season_teams` 조인으로 조회한 **Teams(`teams`) 테이블 `name` 필드** 기준으로 구성
- `1팀`, `2팀` 같은 라벨 문자열은 화면 팀명 표기에 사용하지 않음

## 로그인 후 화면 동작
- 기본 진입 화면은 `home`
- `admin`, `super_admin`는 홈 상단 톱니 아이콘 노출
- 톱니 버튼을 눌렀을 때만 관리자 화면 진입
- 일반 사용자 일정 화면은 통합 캘린더 월간뷰를 사용

## 자동 로그인 정책
- 로그인 성공 시 앱은 자동 로그인 시작 시각을 로컬 저장소에 기록합니다.
- Supabase 세션은 `AsyncStorage`에 저장하고 `autoRefreshToken`으로 갱신합니다.
- 앱 시작 또는 인증 상태 변경 시 마지막 로그인 후 30일이 지나지 않았으면 홈 화면으로 자동 진입합니다.
- 마지막 로그인 후 30일이 지나면 저장된 세션을 로그아웃 처리하고 로그인 화면으로 돌려보냅니다.
- 사용자가 직접 로그아웃하거나 비활성화 계정으로 차단되면 자동 로그인 기록도 함께 삭제합니다.

## 일정 등록 권한 흐름
- 공통: 로그인 회원은 일정 조회 가능
- 개인 일정(`leave`, `business_trip`, `personal`): 본인 생성/수정/삭제
- 경기 일정(`match`): admin 이상 생성/수정/삭제
- 공휴일(`holiday`): 관리자 동기화/보정

## 공휴일 동기화 흐름
1. 관리자가 대상 연도 선택
2. Nager.Date(KR)로 공휴일 동기화 실행
3. `calendar_events`에 upsert
4. 필요 시 관리자 수동 보정

## 푸시 등록
- 로그인/세션 복원 직후 푸시 토큰 등록 시도
- iOS/Android 실기기만 대상
- `push_tokens`에 `user_id`, `token`, `platform` upsert
