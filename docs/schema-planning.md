# DB 스키마 기획 정리

## 개요
이 문서는 현재 메뉴 기획과 운영 정책을 기준으로, Supabase에 생성할 최종 테이블 구조를 정리합니다.

기준 문서:

- `docs/menu-planning.md`
- `docs/auth-flow.md`
- `docs/admin-permissions.md`

핵심 원칙:

- `profiles`는 앱에서 사용하는 사용자 프로필 테이블입니다.
- 실제 인증 계정 원본은 Supabase `auth.users`입니다.
- 프로필 사진 파일은 DB가 아니라 Supabase Storage에 저장합니다.
- 공지사항을 제외한 운영 데이터는 모두 시즌 기준으로 관리합니다.
- 쓰기 권한은 `admin` 이상만 허용하는 구조를 기본으로 합니다.

## 전체 엔터티 구조

초기 최종 테이블은 아래를 기준으로 설계합니다.

1. `profiles`
2. `push_tokens`
3. `notices`
4. `seasons`
5. `teams`
6. `season_teams`
7. `matches`
8. `match_push_logs`

## 1. profiles

앱에서 사용하는 사용자 프로필 테이블입니다.

원본 계정 관계:

- `auth.users` = 인증 계정 원본
- `public.profiles` = 앱 프로필 정보

주요 컬럼:

- `id uuid primary key`
- `name text not null`
- `gender text`
- `role text not null default 'member'`
- `auto_login boolean default true`
- `avatar_path text`
- `created_at timestamptz default now()`

설명:

- `id`는 `auth.users(id)`를 참조합니다.
- `role`은 `member`, `admin`, `super_admin`만 허용합니다.
- `avatar_path`는 Supabase Storage 파일 경로를 저장합니다.
- 프로필 사진 원본 파일은 DB에 저장하지 않습니다.

프로필 이미지 정책:

- Storage 버킷: `profile-images`
- 저장 예시: `profile-images/<user-id>/avatar.jpg`
- `profiles`에는 파일 경로만 저장합니다.

## 2. push_tokens

모바일 푸쉬 알림 수신 토큰 저장 테이블입니다.

주요 컬럼:

- `id bigserial primary key`
- `user_id uuid not null`
- `token text not null`
- `platform text`
- `created_at timestamptz default now()`

설명:

- 사용자별 디바이스 푸쉬 토큰을 저장합니다.
- `platform`은 `ios`, `android`만 허용합니다.
- 동일 사용자와 동일 토큰 중복 저장은 unique 제약으로 막는 것을 권장합니다.

## 3. notices

시즌과 무관한 전역 공지사항 테이블입니다.

주요 컬럼:

- `id bigserial primary key`
- `title text not null`
- `body text`
- `file_url text`
- `author_id uuid`
- `created_at timestamptz default now()`

설명:

- 공지사항은 시즌 비종속 데이터입니다.
- 일반 사용자는 조회만 하고, 관리자는 등록합니다.
- 첨부 파일은 별도 Storage 버킷에 저장하고 URL 또는 경로를 기록합니다.

메모:

- 현재 구조를 유지해도 됩니다.
- 추후 필요하면 `file_path`를 추가해서 Storage 경로까지 함께 관리할 수 있습니다.

## 4. seasons

시즌 운영의 기준이 되는 마스터 테이블입니다.

주요 컬럼:

- `id bigserial primary key`
- `name text not null`
- `slug text not null unique`
- `status text not null default 'draft'`
- `starts_at date`
- `ends_at date`
- `created_by uuid`
- `created_at timestamptz default now()`

설명:

- 시즌 생성은 관리자 기능입니다.
- `status`는 `draft`, `active`, `closed` 정도로 시작하는 것을 권장합니다.
- 팀, 경기, 푸쉬 이력은 모두 시즌을 기준으로 연결합니다.

## 5. teams

팀 마스터 테이블입니다.

주요 컬럼:

- `id bigserial primary key`
- `name text not null`
- `emblem_url text`
- `created_at timestamptz default now()`

설명:

- 팀 자체의 기본 정보만 저장합니다.
- 특정 시즌 참가 여부는 여기서 관리하지 않습니다.
- 같은 팀이 여러 시즌에 반복 참가할 수 있도록 시즌 소속 정보는 분리합니다.

정책:

- 사용자 메뉴에서는 `팀 목록`만 조회합니다.
- 팀 상세 화면은 현재 범위에서 제외합니다.

## 6. season_teams

시즌별 참가 팀 매핑 테이블입니다.

주요 컬럼:

- `id bigserial primary key`
- `season_id bigint not null`
- `team_id bigint not null`
- `display_order int`
- `created_at timestamptz default now()`

제약:

- `(season_id, team_id)` unique

설명:

- 한 팀이 여러 시즌에 참가할 수 있으므로 필수입니다.
- 관리자 `팀 등록` 기능은 실제로는 이 테이블에 행을 추가하는 동작입니다.

## 7. matches

시즌 기준 경기 스케줄 테이블입니다.

주요 컬럼:

- `id bigserial primary key`
- `season_id bigint not null`
- `match_date timestamptz not null`
- `weekday text`
- `place text not null`
- `home_season_team_id bigint not null`
- `away_season_team_id bigint not null`
- `home_score int`
- `away_score int`
- `status text not null default 'scheduled'`
- `push_sent_at timestamptz`
- `created_by uuid`
- `created_at timestamptz default now()`

설명:

- 경기 스케줄은 반드시 시즌에 속해야 합니다.
- 홈팀과 원정팀은 `teams`가 아니라 `season_teams`를 참조하는 것을 권장합니다.
- 이렇게 해야 시즌에 등록되지 않은 팀이 경기 데이터에 섞이지 않습니다.

상태값 예시:

- `scheduled`
- `live`
- `finished`
- `cancelled`

메모:

- 기존 `home_players`, `away_players` 문자열 구조는 운영 데이터 기준으로는 제외합니다.
- 현재 기획에서는 팀 단위 경기 운영에 집중합니다.

## 8. match_push_logs

경기 관련 푸쉬 발송 이력 테이블입니다.

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

설명:

- 경기 스케줄 등록 후 발송한 푸쉬 이력을 남깁니다.
- 누가 언제 어떤 경기 알림을 발송했는지 추적할 수 있어야 합니다.
- 향후 실패 이력, 재발송 여부, 응답 로그를 붙일 수 있습니다.

## Storage 구조

현재 기준 Storage는 아래처럼 사용합니다.

### 1) 프로필 이미지
- 버킷: `profile-images`
- 용도: 사용자 프로필 사진
- DB 저장값: `profiles.avatar_path`

### 2) 공지 첨부 파일
- 버킷: `notice-files`
- 용도: 공지사항 첨부 파일
- DB 저장값: `notices.file_url`
- 필요 시 추후 `file_path` 추가 가능

## 권한 기준

기본 역할:

- `member`
- `admin`
- `super_admin`

권한 원칙:

- 조회: 로그인 사용자 허용
- 생성/수정/삭제: `admin`, `super_admin`만 허용
- 권한 관리: 추후 `super_admin` 전용으로 확장

중요:

- 클라이언트 UI 숨김만으로 권한을 처리하지 않습니다.
- RLS 또는 서버 로직으로 실제 쓰기 권한을 차단해야 합니다.

## 기존 마이그레이션 대비 변경 방향

현재 `supabase/migrations` 기준에서 아래 항목은 재설계가 필요합니다.

### 유지 가능한 항목
- `profiles`
- `push_tokens`
- `notices`

### 구조 변경이 필요한 항목
- `teams`
- `matches`
- `league_table`

이유:

- 현재 구조는 시즌 개념이 없습니다.
- 현재 쓰기 정책은 `created_by = auth.uid()` 기반이라 관리자 운영 구조와 맞지 않습니다.
- `league_table`은 시즌별 집계가 가능하도록 다시 설계해야 합니다.

### 재검토 항목
- `team_members`
- `home_players`
- `away_players`

현재 메뉴 기획 기준에서는 우선순위가 낮습니다.
초기 버전에서는 제외하거나 후순위로 두는 것이 적절합니다.

## 최종 요약

최종 기준은 아래와 같습니다.

1. 사용자 원본 계정은 `auth.users`를 사용합니다.
2. 앱 프로필은 `profiles`에서 관리합니다.
3. 프로필 이미지는 Supabase Storage에 저장하고, `profiles.avatar_path`에 경로를 저장합니다.
4. 공지사항은 시즌과 무관한 전역 데이터입니다.
5. 시즌, 팀 등록, 경기 스케줄, 경기 푸쉬 발송은 모두 시즌 기준으로 관리합니다.
6. 관리자 권한은 `profiles.role`로 판별합니다.
7. 실제 DB 쓰기 권한은 관리자만 허용하도록 RLS를 설계합니다.
