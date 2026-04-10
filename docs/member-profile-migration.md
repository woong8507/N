# 회원 프로필 마이그레이션 가이드

## 목적

Supabase 토큰이 아직 없는 상태에서, 약 17명의 회원 계정을 나중에 한 번에 등록할 수 있도록 입력 형식과 작업 순서를 먼저 정리합니다.

기준:

- 인증 원본은 `auth.users`
- 앱 프로필은 `public.profiles`
- `public.profiles`는 회원 생성 시 DB 트리거로 자동 생성
- 모든 회원 등급은 `member`

관련 문서:

- [`docs/auth-flow.md`](/Users/jkw/Documents/Nproject/docs/auth-flow.md)
- [`docs/schema-planning.md`](/Users/jkw/Documents/Nproject/docs/schema-planning.md)
- [`supabase/migrations/20260409_season_admin_schema.sql`](/Users/jkw/Documents/Nproject/supabase/migrations/20260409_season_admin_schema.sql)

## 준비 파일

회원 목록은 아래 템플릿에 맞춰 정리합니다.

- [`data/member_profiles_template.csv`](/Users/jkw/Documents/Nproject/data/member_profiles_template.csv)

컬럼:

- `email`
- `temp_password`
- `name`
- `gender`
- `role`
- `auto_login`
- `avatar_file_name`
- `avatar_path`

입력 규칙:

- `email`: 실제 로그인에 사용할 이메일
- `temp_password`: 초기 비밀번호
- `name`: 표시 이름
- `gender`: `MALE`, `FEMALE`, `OTHER` 중 하나
- `role`: 이번 마이그레이션에서는 모두 `member`
- `auto_login`: `true` 또는 `false`
- `avatar_file_name`: 사진 파일명을 임시로 적는 용도
- `avatar_path`: 업로드 후 최종 Storage 경로를 적는 용도. 초기에 비워둬도 됨

## 권장 진행 방식

토큰이 없을 때는 아래 순서가 가장 안전합니다.

1. CSV를 먼저 완성합니다.
2. 회원 사진은 일단 제외하고 계정과 프로필만 먼저 생성합니다.
3. Supabase 접근 권한이 준비되면 `auth.users`를 생성합니다.
4. DB 트리거로 `public.profiles`가 자동 생성되는지 확인합니다.
5. 이후 사진이 필요하면 Storage에 업로드하고 `profiles.avatar_path`를 업데이트합니다.

## 왜 profiles만 직접 넣지 않는가

현재 앱 구조에서는 `profiles`가 `auth.users`와 1:1로 연결됩니다.

즉 순서는 아래와 같습니다.

1. `auth.users` 생성
2. `private.handle_new_user()` 트리거 실행
3. `public.profiles` 자동 생성

따라서 `profiles`만 따로 먼저 넣는 방식은 기준 구조와 맞지 않습니다.

## 프로필 사진 처리

사진 파일 자체를 CSV에 넣지 않습니다. DB에는 경로만 저장합니다.

권장 방식:

1. 회원 계정 생성 완료
2. 사진 파일을 Supabase Storage `profile-images` 버킷에 업로드
3. 경로를 `profiles.avatar_path`에 저장

예시 경로:

```text
profile-images/<user-id>/avatar.jpg
```

이번 단계에서는 아래 둘 중 하나를 선택하면 됩니다.

- 가장 단순한 방법: 사진 없이 회원 마이그레이션 먼저 진행
- 나중에 일괄 반영할 방법: 사진 파일명을 `avatar_file_name`에만 미리 적어두기

예:

```csv
email,temp_password,name,gender,role,auto_login,avatar_file_name,avatar_path
hong@example.com,Temp1234!,홍길동,MALE,member,true,hong.jpg,
kim@example.com,Temp1234!,김민지,FEMALE,member,true,kim.png,
```

## CSV 작성 예시

```csv
email,temp_password,name,gender,role,auto_login,avatar_file_name,avatar_path
member01@example.com,Temp1234!,홍길동,MALE,member,true,,
member02@example.com,Temp1234!,김민지,FEMALE,member,true,,
member03@example.com,Temp1234!,이준,OTHER,member,true,,
```

## 추후 실행 시 해야 할 일

Supabase 토큰 또는 관리자 접근 권한이 준비되면 아래 작업을 진행합니다.

1. CSV 기준으로 `auth.users` 계정 생성
2. 생성된 사용자별 `profiles` 자동 생성 여부 확인
3. 누락된 `auto_login`, `avatar_path` 등 보조 필드 업데이트
4. 사진이 있으면 Storage 업로드 후 `profiles.avatar_path` 반영

## 현재 단계에서 필요한 것

지금은 아래까지만 하면 충분합니다.

1. [`data/member_profiles_template.csv`](/Users/jkw/Documents/Nproject/data/member_profiles_template.csv)에 17명 정보 입력
2. 사진을 나중에 쓸 생각이면 파일명만 `avatar_file_name`에 미리 적기
3. 토큰 준비 후 실제 마이그레이션 실행
