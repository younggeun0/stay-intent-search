// 평가셋 정답 조건으로 검색해 결과 수와 0건일 때의 대안을 출력한다. 빈 결과 목록(direction.md 9장)의 출처
import assert from "node:assert/strict";
import { cases } from "../../eval/cases";
import { candidateStays, search } from "./search";

for (const c of cases) {
  const r = search(c.expected);
  const dates = r.datesKnown ? `일정 ${r.hits.reduce((n, h) => n + h.stays.length, 0)}` : "날짜 미정";
  const alt = r.relaxations.map((o) => `${o.label}(${o.count})`).join(", ");
  console.log(`${c.id.padEnd(4)} 객실 ${String(r.hits.length).padStart(2)} · ${dates}${r.hits.length ? "" : `  → 대안: ${alt || "없음"}`}`);
}

const base = cases[0].expected;
const blank = { ...base, region: null, area: null, checkIn: null, checkOut: null, dateRange: null, nights: null, weekend: null, guests: null, infants: null, pet: null, oceanView: null, minBedrooms: null, minBeds: null, features: [], facilities: [], unhandled: [] };
// 주말 포함 2박: 금~일 또는 토~월만 (2026-11-21은 토요일)
assert.deepEqual(candidateStays({ ...blank, dateRange: { from: "2026-11-19", to: "2026-11-23" }, nights: 2, weekend: true })!.map((s) => s.checkIn), ["2026-11-20", "2026-11-21"]);
// 예약 불가 기간 [10-16, 10-19)과 겹치면 빠지고, 끝나는 날 체크인은 된다
const pet = { ...blank, pet: true };
assert.equal(search({ ...pet, checkIn: "2026-10-17", checkOut: "2026-10-18" }).hits.length, 0);
assert.equal(search({ ...pet, checkIn: "2026-10-19", checkOut: "2026-10-20" }).hits.length, 1);
assert.ok(search({ ...pet, checkIn: "2026-10-17", checkOut: "2026-10-18" }).relaxations.some((o) => o.label === "다른 날짜"));
console.log("\n검색 검증 통과");
