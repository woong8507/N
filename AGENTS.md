# Repository Guidelines

## 프로젝트 구조 및 모듈 구성
이 저장소는 iOS, Android, 웹을 대상으로 하는 Expo SDK 55 앱입니다. 메인 UI 진입점은 [`App.tsx`](/Users/jungalima/Documents/Playground/App.tsx)이며, 현재 인증 흐름과 예시 일정 화면을 포함합니다. 공통 연동 코드는 [`src/lib`](/Users/jungalima/Documents/Playground/src/lib)에 있습니다. [`supabase.ts`](/Users/jungalima/Documents/Playground/src/lib/supabase.ts)는 클라이언트를 생성하고, [`push.ts`](/Users/jungalima/Documents/Playground/src/lib/push.ts)는 푸시 등록을 처리합니다. Expo 설정은 [`app.config.ts`](/Users/jungalima/Documents/Playground/app.config.ts), 정적 이미지는 [`assets`](/Users/jungalima/Documents/Playground/assets), 환경 변수 예시는 [`.env.example`](/Users/jungalima/Documents/Playground/.env.example)에 있습니다.

## 문서 참고 규칙
작업 전 반드시 [`README.md`](/Users/jungalima/Documents/Playground/README.md)와 [`docs`](/Users/jungalima/Documents/Playground/docs) 폴더를 먼저 확인하세요. 특히 인증 흐름, Supabase 연동, 운영 규칙 변경은 [`auth-flow.md`](/Users/jungalima/Documents/Playground/docs/auth-flow.md)를 기준으로 구현과 문서를 함께 맞춰야 합니다.

## 빌드, 테스트 및 개발 명령어
- `npm install`: 의존성을 설치합니다. README 기준 Node 20.19+ 권장을 따릅니다.
- `npm run start`: Expo 개발 서버를 실행하고 디바이스 또는 시뮬레이터를 선택합니다.
- `npm run web`: React Native Web 환경으로 브라우저에서 앱을 실행합니다.
- `npm run ios` / `npm run android`: 로컬에서 네이티브 타깃을 빌드하고 실행합니다.
- `npm run lint`: `.js`, `.jsx`, `.ts`, `.tsx` 파일에 대해 ESLint를 실행합니다.

## 코드 스타일 및 네이밍 규칙
[`tsconfig.json`](/Users/jungalima/Documents/Playground/tsconfig.json)에서 `strict`와 `noUncheckedIndexedAccess`가 활성화된 TypeScript를 사용합니다. 기존 스타일을 따르세요: 들여쓰기는 2칸, 문자열은 작은따옴표, 문장 끝 세미콜론, 포매터가 넣는 trailing comma를 유지합니다. React 컴포넌트와 타입은 PascalCase, 함수·변수·훅은 camelCase를 사용하고, 유틸리티 모듈은 `src/lib` 아래에 둡니다. `src` 내부 새 import에는 `@/` 별칭을 우선 사용합니다.

## 테스트 가이드
현재 자동화된 테스트 스위트는 없습니다. 테스트가 추가되기 전까지 모든 변경은 `npm run lint`를 통과해야 하며, 수정한 대상에 맞춰 최소 한 가지 플랫폼에서 수동 검증해야 합니다 (`npm run web`, `npm run ios`, `npm run android`). 테스트를 추가할 때는 기능 파일 옆에 `*.test.ts` 또는 `*.test.tsx` 형식으로 두고, 인증, Supabase 연동, 알림 흐름부터 우선 검증하세요.

## 커밋 및 Pull Request 가이드
이 저장소에는 아직 커밋 이력이 없으므로 지금부터 간단한 규칙을 적용합니다. 커밋 제목은 `Add Supabase note upload flow`, `Fix push token upsert`처럼 짧은 명령형 문장으로 작성하세요. 커밋은 한 가지 주제에 집중하고, 특별한 이유가 없다면 설정 변경, UI 수정, 백엔드 연동을 한 커밋에 섞지 마세요. PR에는 변경 요약, 관련 이슈 링크가 있다면 함께 기재하고, 환경 변수 또는 스키마 변경 사항, UI 변경 시 스크린샷이나 화면 녹화를 포함하세요.

## 보안 및 설정 팁
`.env`는 커밋하지 마세요. 항상 `cp .env.example .env`로 시작합니다. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, Expo `eas.projectId`는 환경별 값으로 관리하고, 필요한 SQL 정책 변경 사항은 PR 설명에 문서화하세요.
