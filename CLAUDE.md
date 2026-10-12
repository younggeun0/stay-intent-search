# stay-intent-search

어반스테이 채용 과제 레포. 마감 2026-10-16(금) 24:00.

## 세션 시작 시
1. `docs/direction.md`를 먼저 읽는다. 문제 정의, 결정 기록, 범위, 일정이 모두 여기 있다.
2. 일정표(7장)와 미결정 사항(8장)으로 오늘 할 일을 확인한다. 파일 위치는 9장.
3. Next.js 코드를 쓰기 전에 `AGENTS.md`를 읽는다 (Next 16, 학습 데이터와 API가 다르다).

## 명령
- `npm run eval:check`: 평가셋 라벨 불변식 검증
- `npm run inventory:check`: 인벤토리 검증
- `npx tsc --noEmit`: 타입 검사 (`LayoutProps` 오류가 나면 `npx next typegen` 먼저)

## 규칙
- 방향이나 범위가 바뀌면 `docs/direction.md`를 먼저 고친다.
- AI 제안을 채택, 수정, 반려했다면 `docs/ai-log.md`에 날짜별로 기록한다. 평가 항목이다.
- LLM은 검색 조건 추출만 맡는다. 객실, 재고, 가격을 LLM이 생성하게 하지 않는다.
- 평가셋을 바꾸거나 프롬프트를 수정하면 평가를 다시 돌리고 수치를 기록한다.
- 프롬프트는 dev 케이스로만 고친다. holdout 실패 케이스를 보고 프롬프트를 고치지 않는다.
- 정답 라벨(`eval/cases.json`)은 사용자 검수 대상이다. 임의로 바꾸지 말고 제안한다.
