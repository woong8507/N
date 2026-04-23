# 관리자 메뉴 권한 정리

## 개요
이 문서는 로그인 이후 메인화면과 관리자 메뉴에서 사용할 권한 기준을 정리합니다.
인증 자체는 `docs/auth-flow.md`, 캘린더 상세는 `docs/calendar-event-planning.md`를 기준으로 합니다.

## 권한 설계 원칙
1. 권한은 UI 숨김만으로 처리하지 않고, Supabase RLS 또는 서버 로직으로 반드시 차단합니다.
2. 일반 사용자는 조회 중심, 관리자는 운영/수정 기능 중심으로 구분합니다.
3. 메뉴 노출 여부와 실제 실행 권한은 분리합니다.
4. 권한 기준값은 `profiles.role`, `profiles.status`를 사용합니다.

## 기본 역할 구분
- `member`: 일반 로그인 사용자
- `admin`: 운영 관리자
- `super_admin`: 최고 관리자

## 일정/캘린더 권한 기준
### 공통 조회
- 로그인 회원은 통합 캘린더(`calendar_events`) 조회 가능
- 조회 범위에는 공휴일, 경기, 회원 일정이 포함됨

### 개인 일정 (`leave`, `business_trip`, `personal`)
- `member`: 본인 일정 생성/수정/삭제 가능
- `admin`, `super_admin`: 전체 개인 일정 관리 가능

### 경기 일정 (`match`)
- 생성/수정/삭제: `admin` 이상
- 일반 회원은 조회만 가능

### 공휴일 (`holiday`)
- 자동 동기화 실행: `admin` 이상
- 수동 보정/삭제: `admin` 이상
- 일반 회원은 조회만 가능

## 관리자 메뉴 권한 기준
### 일반 사용자(`member`)
- 홈, 일정, 리그, 팀, 공지 조회 가능
- 관리자 메뉴 비노출

### 운영 관리자(`admin`)
- 일반 사용자 권한 모두 포함
- 공지 등록/수정/삭제
- 시즌 생성/활성화 전환
- 팀 관리, 경기 등록/수정
- 공휴일 동기화 실행 및 보정
- 회원 `department`/`status` 수정
- 회원 삭제 버튼 실행 시 `profiles.is_deleted = true` 업데이트(소프트 삭제)

### 최고 관리자(`super_admin`)
- 운영 관리자 권한 모두 포함
- 사용자 역할(`role`) 변경
- 관리자 권한 부여/회수

## 메뉴 노출 기준
- `member`: 관리자 메뉴 미노출
- `admin`, `super_admin`: 홈 상단 톱니 버튼 노출
- 관리자 페이지 진입은 톱니 버튼 동선으로만 허용

권한 없는 사용자가 직접 경로 진입 시:
- 즉시 권한 체크
- `권한이 없습니다` 안내 후 홈으로 이동

## RLS 적용 권장 사항
- `calendar_events`:
  - `select`: authenticated 허용
  - 개인 일정 쓰기: `auth.uid() = created_by` 또는 admin
  - `match`, `holiday` 쓰기: admin 전용
- `matches`, `seasons`, `season_teams`, `teams`, `notices` 쓰기: admin 전용
- `profiles.role` 변경: super_admin 전용

## 앱 구현 기준
- 로그인 후 `profiles`에서 `name`, `gender`, `role`, `status`, `department`를 로드
- `status = inactive`는 홈 진입 전 차단
- 일정 화면은 `calendar_events` 기준으로 렌더링
- 경기 등록 화면은 `3F/4F`, 시작/종료 시간, 팀 구성 입력을 필수로 처리
- 회원 관리 화면은 `is_deleted = true` 회원을 노출하지 않음

## 우선 적용 권한안
1. `member`
2. `admin`
3. `super_admin` (역할 위임 필요 시 활성화)

## 추후 확장 포인트
- 관리자 활동 로그
- 세부 권한 분리 (`calendar_admin`, `holiday_admin`)
- 운영 화면 접근 이력 저장
