// 검색 조건 → 객실과 가능한 숙박 일정. LLM 없이 결정적으로 동작한다 (direction.md 4장).
// 데이터 소스를 PMS로 바꾸면 이 파일만 교체한다 (direction.md 10장).
import { BRANCHES, ROOMS } from "./inventory";
import type { Branch, Room, SearchConditions } from "./schema";

export type Stay = { checkIn: string; checkOut: string; nights: number; total: number };
export type Hit = { room: Room; branch: Branch; stays: Stay[] }; // 날짜 미정이면 stays는 []
export type Relaxation = { label: string; conditions: SearchConditions; count: number };
export type SearchResult = { hits: Hit[]; datesKnown: boolean; relaxations: Relaxation[] };

const DAY_MS = 86_400_000;
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
const diffDays = (a: string, b: string) => (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS;
const isSaturday = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay() === 6;

// 토퍼는 침대로 세지 않는다. "침대 따로"를 토퍼로 채우면 고객 기대와 다르다
export const bedCount = (r: Room) => r.beds.filter((b) => b.type !== "토퍼").reduce((n, b) => n + b.count, 0);

// 고객이 말한 날짜 조건 → 후보 일정 [checkIn, checkOut). 날짜가 없으면 null
export function candidateStays(c: SearchConditions): { checkIn: string; checkOut: string }[] | null {
  if (c.checkIn && c.checkOut) return [{ checkIn: c.checkIn, checkOut: c.checkOut }];
  if (!c.dateRange) return null;
  const nights = c.nights ?? 1;
  const out = [];
  for (let d = c.dateRange.from; d <= c.dateRange.to; d = addDays(d, 1)) {
    const stay = { checkIn: d, checkOut: addDays(d, nights) };
    // 주말 포함 = 토요일 밤을 묵는다
    if (c.weekend && !Array.from({ length: nights }, (_, i) => addDays(d, i)).some(isSaturday)) continue;
    out.push(stay);
  }
  return out;
}

// 예약 불가 기간 [from, to)과 숙박 [checkIn, checkOut)이 겹치면 불가
const available = (r: Room, s: { checkIn: string; checkOut: string }) =>
  r.blocked.every((b) => s.checkOut <= b.from || b.to <= s.checkIn);

function matchesRoom(r: Room, b: Branch, c: SearchConditions): boolean {
  return (
    (!c.region || b.region === c.region) &&
    (!c.area || b.areas.includes(c.area)) &&
    // 36개월 이하 영유아는 인원수에 포함하지 않는다 (direction.md 3장 관찰 4)
    (c.guests === null || c.guests <= r.maxGuests) &&
    (!c.pet || r.petAllowed) &&
    (!c.oceanView || r.oceanView) &&
    (c.minBedrooms === null || r.bedrooms >= c.minBedrooms) &&
    (c.minBeds === null || bedCount(r) >= c.minBeds) &&
    c.features.every((f) => r.features.includes(f)) &&
    c.facilities.every((f) => r.facilities.includes(f))
  );
}

export function find(c: SearchConditions): Hit[] {
  const stays = candidateStays(c);
  const hits: Hit[] = [];
  for (const room of ROOMS) {
    const branch = BRANCHES.find((b) => b.id === room.branchId)!;
    if (!matchesRoom(room, branch, c)) continue;
    if (!stays) { hits.push({ room, branch, stays: [] }); continue; }
    const ok = stays.filter((s) => available(room, s))
      .map((s) => ({ ...s, nights: diffDays(s.checkIn, s.checkOut), total: room.pricePerNight * diffDays(s.checkIn, s.checkOut) }));
    if (ok.length) hits.push({ room, branch, stays: ok });
  }
  return hits.sort((a, b) => a.room.pricePerNight - b.room.pricePerNight);
}

const FEATURE_LABEL = { bathtub: "욕조", spa: "스파", twin: "트윈", barrierFree: "베리어프리", loft: "복층", connecting: "커넥팅" } as const;
const FACILITY_LABEL = { kitchen: "주방", washer: "세탁기", dishwasher: "식기세척기", desk: "업무용 책상", styler: "스타일러" } as const;

// 조건을 하나씩 풀어 본 후보. 인원은 풀지 않는다(못 묵는 방을 권할 수 없다)
function relaxOptions(c: SearchConditions): { label: string; conditions: SearchConditions }[] {
  const opts: { label: string; conditions: SearchConditions }[] = [];
  const push = (label: string, patch: Partial<SearchConditions>) => opts.push({ label, conditions: { ...c, ...patch } });
  // 정확한 날짜가 막혔으면 같은 박수로 이후 4주 안에서 찾는다
  if (c.checkIn && c.checkOut) {
    const nights = diffDays(c.checkIn, c.checkOut);
    const weekend = Array.from({ length: nights }, (_, i) => addDays(c.checkIn!, i)).some(isSaturday) || null;
    push("다른 날짜", { checkIn: null, checkOut: null, dateRange: { from: addDays(c.checkIn, 1), to: addDays(c.checkIn, 28) }, nights, weekend });
  }
  if (c.weekend) push("주말 제외", { weekend: null });
  if (c.area) push(`${c.area} 대신 ${c.region} 전체`, { area: null });
  if (c.region) push("다른 지역", { region: null, area: null });
  if (c.pet) push("반려동물 동반 제외", { pet: null });
  if (c.oceanView) push("오션뷰 제외", { oceanView: null });
  if (c.minBedrooms !== null) push(`방 ${c.minBedrooms}개 조건 제외`, { minBedrooms: null });
  if (c.minBeds !== null) push(`침대 ${c.minBeds}개 조건 제외`, { minBeds: null });
  for (const f of c.features) push(`${FEATURE_LABEL[f]} 제외`, { features: c.features.filter((x) => x !== f) });
  for (const f of c.facilities) push(`${FACILITY_LABEL[f]} 제외`, { facilities: c.facilities.filter((x) => x !== f) });
  return opts;
}

export function search(c: SearchConditions): SearchResult {
  const hits = find(c);
  const datesKnown = candidateStays(c) !== null;
  const relaxations = hits.length
    ? []
    : relaxOptions(c).map((o) => ({ ...o, count: find(o.conditions).length })).filter((o) => o.count > 0);
  return { hits, datesKnown, relaxations };
}
