// 평가셋 정답 조건으로 검색해 결과 수와 0건일 때의 대안을 출력한다. 빈 결과 목록(direction.md 9장)의 출처
import assert from "node:assert/strict";
import { cases, EMPTY } from "../../eval/cases";
import { candidateStays, search } from "./search";

for (const c of cases) {
  const r = search(c.expected);
  const dates = r.datesKnown ? `일정 ${r.hits.reduce((n, h) => n + h.stays.length, 0)}` : "날짜 미정";
  console.log(`${c.id.padEnd(4)} 객실 ${String(r.hits.length).padStart(2)} · ${dates}`);
  for (const why of r.reasons) console.log(`     ✗ ${why}`);
  for (const o of r.relaxations) console.log(`     → ${o.labels.join(" + ")}: ${o.count}실\n${o.reasons.map((w) => `         ${w}`).join("\n")}`);
}

const blank = EMPTY;
// 주말 포함 2박: 금~일 또는 토~월만 (2026-11-21은 토요일)
assert.deepEqual(candidateStays({ ...blank, dateRange: { from: "2026-11-19", to: "2026-11-23" }, nights: 2, weekend: true })!.map((s) => s.checkIn), ["2026-11-20", "2026-11-21"]);
// 예약 불가 기간 [10-16, 10-19)과 겹치면 빠지고, 끝나는 날 체크인은 된다
const pet = { ...blank, pet: true };
assert.equal(search({ ...pet, checkIn: "2026-10-17", checkOut: "2026-10-18" }).hits.length, 0);
assert.equal(search({ ...pet, checkIn: "2026-10-19", checkOut: "2026-10-20" }).hits.length, 2); // 펫 객실은 시흥 웨이브파크 2실
assert.ok(search({ ...pet, checkIn: "2026-10-17", checkOut: "2026-10-18" }).relaxations.some((o) => o.labels.join() === "다른 날짜"));
assert.match(search({ ...pet, checkIn: "2026-10-17", checkOut: "2026-10-18" }).relaxations.flatMap((o) => o.reasons).join(), /예약이 찼어요/);
// 인천·속초 모두 펫+오션뷰 객실 없음: 지역 하나만 바꿔서는 안 되고, 두 조건을 같이 풀어야 하는 조합이 나와야 한다
const both = search({ ...blank, region: "강원", area: "속초", pet: true, oceanView: true });
assert.ok(both.relaxations.every((o) => o.labels.length >= 1) && both.relaxations.length > 0);
// 인원은 풀지 않는다
assert.ok(search({ ...blank, guests: 30 }).relaxations.length === 0);
assert.match(search({ ...blank, guests: 30 }).reasons[0], /30명 숙박 가능/);
console.log("\n검색 검증 통과");
