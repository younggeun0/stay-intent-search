// 정답 라벨 검증: 스키마 + 해석 규칙에서 나오는 불변식. 검수용으로 요일을 함께 출력한다.
import { cases } from "./cases";

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
  console.log(`${c.id} [ref ${fmt(c.referenceDate)}] ${when}  ${c.input}`);
}

const count = (s: string) => cases.filter((c) => c.split === s).length;
console.log(`\ndev ${count("dev")} / holdout ${count("holdout")}`);
if (errors.length) {
  console.error(`\n라벨 오류 ${errors.length}건:\n${errors.join("\n")}`);
  process.exit(1);
}
console.log("라벨 불변식 통과");
