// 정답 라벨 검증: 스키마 + 해석 규칙에서 나오는 불변식. 검수용으로 요일을 함께 출력한다.
import assert from "node:assert/strict";
import { cases } from "./cases";
import { clarifyErrors, wrongFields } from "./score";
import { normalize } from "../src/lib/normalize";

const DAY = "일월화수목금토";
const dow = (d: string) => DAY[new Date(`${d}T00:00:00Z`).getUTCDay()];
const fmt = (d: string | null) => (d ? `${d.slice(5)}(${dow(d)})` : "-");

const errors: string[] = [];
const ids = new Set<string>();

for (const c of cases) {
  const e = c.expected;
  const fail = (msg: string) => errors.push(`${c.id}: ${msg}`);
  if (ids.has(c.id)) fail("중복 id");
  ids.add(c.id);
  if ((e.checkIn === null) !== (e.checkOut === null)) fail("checkIn/checkOut 중 하나만 있음");
  if (e.checkIn && e.checkOut && e.checkOut <= e.checkIn) fail("checkOut <= checkIn");
  if (e.checkIn && e.checkIn < c.referenceDate) fail("checkIn이 referenceDate보다 과거");
  const r = e.dateRange;
  if (e.checkIn && (r || e.nights !== null || e.weekend !== null)) fail("특정 날짜와 기간 필드를 같이 씀");
  if (r && r.to < r.from) fail("dateRange.to < from");
  if (r && r.to < c.referenceDate) fail("dateRange가 referenceDate보다 과거");
  if (e.weekend !== null && !r) fail("weekend는 기간 검색에서만");
  const noDates = e.checkIn === null && r === null;
  if (noDates !== e.needsClarification.includes("dates")) fail("날짜·기간 없음 ⇔ dates 되묻기 불일치");
  if ((e.guests === null) !== e.needsClarification.includes("guests")) fail("인원 없음 ⇔ guests 되묻기 불일치");
  if (e.area && !e.region) fail("area가 있는데 region 없음");

  const when = r
    ? `기간 ${fmt(r.from)}~${fmt(r.to)}${e.nights ? ` ${e.nights}박` : ""}${e.weekend ? " 주말" : ""}`
    : `${fmt(e.checkIn)} → ${fmt(e.checkOut)}${e.nights ? ` (${e.nights}박)` : ""}`;
  const input = typeof c.input === "string" ? c.input : c.input.map((t) => `${t.role === "user" ? "고객" : "AI"}: ${t.text}`).join(" / ");
  if (typeof c.input !== "string" && c.input.at(-1)?.role !== "user") fail("대화는 고객 턴으로 끝나야 함");
  console.log(`${c.id} [ref ${fmt(c.referenceDate)}] ${when}  ${input}`);
}

// 채점기 자체 검사: 채점이 틀리면 모든 수치가 무의미하다
{
  const base = cases[0].expected;
  assert.deepEqual(wrongFields(base, structuredClone(base)), []);
  assert.deepEqual(wrongFields({ ...base, features: ["spa", "loft"] }, { ...base, features: ["loft", "spa"] }), []);
  assert.deepEqual(wrongFields({ ...base, unhandled: ["주차"] }, { ...base, unhandled: ["무료 주차"] }), []);
  assert.deepEqual(wrongFields({ ...base, unhandled: ["주차"] }, { ...base, unhandled: [] }), ["unhandled"]);
  assert.deepEqual(wrongFields(base, { ...base, dateRange: { from: "2026-11-01", to: "2026-11-30" } }), ["dateRange"]);
  assert.deepEqual(clarifyErrors({ ...base, needsClarification: ["dates"] }, { ...base, needsClarification: ["guests"] }), { missed: ["dates"], extra: ["guests"] });
}

// 정규화 검사: 모든 정답 라벨은 정규화해도 그대로여야 한다 (라벨과 코드 규칙이 일치하는지)
for (const c of cases) assert.deepEqual(normalize(c.expected), { ...c.expected, needsClarification: [...c.expected.needsClarification].sort() }, `${c.id}: 정규화 후 라벨이 바뀜`);
{
  const base = { ...cases[0].expected };
  const n = normalize({ ...base, checkIn: null, checkOut: null, guests: null, infants: 0, pet: false, region: "부산", area: "부산" });
  assert.deepEqual([n.infants, n.pet, n.area, n.needsClarification], [null, null, null, ["dates", "guests"]]);
  assert.equal(normalize({ ...base, nights: 2, weekend: true }).nights, null); // 날짜가 있으면 기간 필드 제거
}

const count = (s: string) => cases.filter((c) => c.split === s).length;
console.log(`\ndev ${count("dev")} / holdout ${count("holdout")}`);
if (errors.length) {
  console.error(`\n라벨 오류 ${errors.length}건:\n${errors.join("\n")}`);
  process.exit(1);
}
console.log("라벨 불변식 통과");
