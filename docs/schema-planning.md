# DB 스키마 기획 정리

## 개요
이 문서는 현재 메뉴 기획과 운영 정책을 기준으로 Supabase 테이블 구조를 정리합니다.

기준 문서:
- `docs/menu-planning.md`
- `docs/auth-flow.md`
- `docs/admin-permissions.md`
- `docs/calendar-event-planning.md`

핵심 원칙:
- 공지사항을 제외한 운영 데이터는 시즌 기준으로 관리합니다.
- 통합 일정 조회는 `calendar_events`를 중심으로 처리합니다.
- 경기 데이터 원본은 `matches`를 유지하고 캘린더 이벤트와 연결합니다.
- 쓰기 권한은 기본적으로 `admin` 이상이되, 개인 일정은 본인 쓰기를 허용합니다.

## 전체 엔터티 구조
1. `profiles`
2. `push_tokens`
3. `notices`
4. `seasons`
5. `teams`
6. `season_teams`
7. `matches`
8. `calendar_events`
9. `match_push_logs`
10. `match_attendance`

## 1. profiles
주요 컬럼:
- `id uuid primary key`
- `name text not null`
- `gender text`
- `role text not null default 'member'`
- `status text not null default 'active'`
- `department text`
- `auto_login boolean default true`
- `avatar_path text`
- `is_deleted boolean not null default false`
- `created_at timestamptz default now()`

권장 제약:
- `profiles_role_check`: `role in ('member', 'admin', 'super_admin')`
- `profiles_status_check`: `status in ('active', 'inactive')`
- `profiles_department_check`: `department is null or department in ('1부', '2부', '3부', '4부')`

## 2. push_tokens
주요 컬럼:
- `id bigserial primary key`
- `user_id uuid not null`
- `token text not null`
- `platform text`
- `created_at timestamptz default now()`

## 3. notices
주요 컬럼:
- `id bigserial primary key`
- `title text not null`
- `body text`
- `file_path text`
- `file_url text`
- `author_id uuid`
- `created_at timestamptz default now()`

## 4. seasons
주요 컬럼:
- `id bigserial primary key`
- `name text not null`
- `description text`
- `slug text not null unique`
- `status text not null default 'inactive'`
- `starts_at date`
- `ends_at date`
- `created_by uuid`
- `created_at timestamptz default now()`

운영 규칙:
- 동시에 `active` 시즌은 하나만 허용
- 일반 사용자 노출 데이터는 active 시즌 기준

## 5. teams
주요 컬럼:
- `id bigserial primary key`
- `name text not null`
- `emblem_url text`
- `created_at timestamptz default now()`

## 6. season_teams
주요 컬럼:
- `id bigserial primary key`
- `season_id bigint not null`
- `team_id bigint not null`
- `display_order int`
- `created_at timestamptz default now()`

제약:
- `(season_id, team_id)` unique

## 7. matches
시즌 기준 경기 원본 테이블입니다.

주요 컬럼:
- `id bigserial primary key`
- `season_id bigint not null`
- `match_date timestamptz not null`
- `match_start_at timestamptz not null`
- `match_end_at timestamptz not null`
- `weekday text`
- `place text not null` (`3F`, `4F`)
- `home_season_team_id bigint not null`
- `away_season_team_id bigint not null`
- `home_score int`
- `away_score int`
- `status text not null default 'scheduled'`
- `push_sent_at timestamptz`
- `created_by uuid`
- `created_at timestamptz default now()`

설명:
- 경기 등록은 관리자만 수행
- `home_season_team_id`, `away_season_team_id`는 `season_teams` 참조
- `match_start_at`, `match_end_at`는 캘린더 시간 표시와 충돌 확인 기준으로 사용
- 화면 팀명은 `season_teams`를 통해 참조한 **Teams(`teams`) 테이블 `name` 필드**를 사용
- `1팀`, `2팀` 같은 라벨은 저장/표시 기준으로 사용하지 않음

## 8. calendar_events
통합 캘린더 조회 테이블입니다.

주요 컬럼:
- `id bigserial primary key`
- `season_id bigint null`
- `linked_match_id bigint null`
- `event_type text not null`
- `title text not null`
- `description text`
- `location_floor text`
- `start_at timestamptz not null`
- `end_at timestamptz not null`
- `is_all_day boolean not null default false`
- `source_type text not null default 'manual'`
- `created_by uuid`
- `created_at timestamptz default now()`

이벤트 타입:
- `holiday`
- `match`
- `leave`
- `business_trip`
- `personal`

권장 제약:
- `calendar_events_type_check`: `event_type in ('holiday','match','leave','business_trip','personal')`
- `calendar_events_time_check`: `end_at > start_at`
- `calendar_events_floor_check`: `location_floor is null or location_floor in ('3F','4F')`
- `linked_match_id`는 `match` 이벤트에서만 사용

시간 저장 운영 규칙:
- 종일 일정(`holiday`, `leave`, `business_trip`, `personal`)은 KST 기준 `12:00`~`12:01`로 저장
- 목적:
  - `calendar_events_time_check (end_at > start_at)` 충족
  - UTC 변환 시 날짜가 하루 전으로 밀리는 문제 방지
- 경기 `match_date`는 KST 기준 정오(`12:00`) 앵커로 저장

권장 인덱스:
- `calendar_events_start_at_idx` on `(start_at)`
- `calendar_events_type_idx` on `(event_type)`
- `calendar_events_created_by_idx` on `(created_by)`
- `calendar_events_season_id_idx` on `(season_id)`
- `calendar_events_linked_match_id_uidx` unique where `linked_match_id is not null`

연동 규칙:
- `match`는 `matches` 변경 시 트리거/서버 로직으로 upsert
- 개인 일정은 `calendar_events` 직접 작성
- 공휴일은 동기화 작업으로 upsert
- 관리자 수동 공휴일도 `calendar_events(event_type='holiday', source_type='manual')`로 저장
- 경기 캘린더 제목/라벨은 `teams.name` 기반(`home_team_name vs away_team_name`)으로 동기화

경기 등록 충돌 규칙(앱 레벨):
- 경기일 공휴일 존재 시 팀 선택/저장 모두 차단
- 참여 선수의 `leave|business_trip|personal` 일정이 경기일과 겹치면 충돌 처리

## 9. match_push_logs
주요 컬럼:
- `id bigserial primary key`
- `match_id bigint not null`
- `season_id bigint not null`
- `title text not null`
- `body text not null`
- `target_count int`
- `status text`
- `sent_by uuid`
- `sent_at timestamptz default now()`

## 10. match_attendance
금일 경기 참석 여부 저장 테이블입니다.

주요 컬럼:
- `id bigserial primary key`
- `match_id bigint not null`
- `user_id uuid not null`
- `status text not null default 'pending'`
- `checked_at timestamptz`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

권장 제약:
- `match_attendance_status_check`: `status in ('pending','attend','absent')`
- `match_attendance_match_user_uidx`: unique `(match_id, user_id)`

권장 인덱스:
- `match_attendance_match_id_idx` on `(match_id)`
- `match_attendance_user_id_idx` on `(user_id)`
- `match_attendance_status_idx` on `(status)`

운영 규칙:
- 일반 회원은 본인(`auth.uid() = user_id`) 행만 수정 가능
- 관리자(`admin`, `super_admin`)는 조회/관리 가능
- 앱 레벨에서 **KST 금일 경기만 상태 변경 허용**
- 상태가 `attend` 또는 `absent`로 바뀌는 시점에 `checked_at = now()` 기록

## Storage 구조
### 1) 프로필 이미지
- 버킷: `profile_img`
- DB 저장값: `profiles.avatar_path`

### 2) 공지 첨부 파일
- 버킷: `notice-files`
- DB 저장값: `notices.file_path`

### 3) 팀 로고
- 버킷: `team-logos`
- DB 저장값: `teams.emblem_url`
- 관리 화면에서 파일 업로드 후 public URL을 저장하는 방식으로 운영합니다.

## 권한 기준 요약
- 조회: 로그인 사용자 허용
- 경기/시즌/팀/공지 쓰기: `admin`, `super_admin`
- 개인 일정(`leave`, `business_trip`, `personal`) 쓰기: 본인 + 관리자
- 공휴일(`holiday`) 쓰기: 관리자
- 경기 참석(`match_attendance`) 쓰기: 본인 + 관리자(앱에서 금일 경기만 허용)

## 최종 요약
1. 경기 원본은 `matches`, 통합 조회는 `calendar_events`로 분리합니다.
2. 캘린더 시간 정책은 `is_all_day + start_at/end_at`로 통일합니다.
3. 공휴일/경기/개인일정을 한 월간 캘린더에서 함께 노출합니다.
