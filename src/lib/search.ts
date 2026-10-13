// 검색 조건 → 객실과 가능한 숙박 일정. LLM 없이 결정적으로 동작한다 (direction.md 4장).
// 데이터 소스를 PMS로 바꾸면 이 파일만 교체한다 (direction.md 10장).
import { BRANCHES, ROOMS } from "./inventory";
import type { Branch, Room, SearchConditions } from "./schema";

export type Stay = { checkIn: string; checkOut: string; nights: number; total: number };
export type Hit = { room: Room; branch: Branch; stays: Stay[] }; // 날짜 미정이면 stays는 []
export type Relaxation = { labels: string[]; reasons: string[]; conditions: SearchConditions; count: number }; // labels를 모두 바꾸면 count실, reasons는 각 조건이 막힌 이유
export type Step = { label: string; count: number; place?: true }; // 이 조건까지 적용했을 때 남는 객실 수
export type SearchResult = { hits: Hit[]; datesKnown: boolean; relaxations: Relaxation[]; reasons: string[] }; // reasons는 대안이 하나도 없을 때만

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

const FEATURE_LABEL = { bathtub: "욕조", spa: "스파", twin: "트윈", barrierFree: "베리어프리", loft: "복층", connecting: "커넥팅" } as const;
const FACILITY_LABEL = { kitchen: "주방", washer: "세탁기", dishwasher: "식기세척기", desk: "업무용 책상", styler: "스타일러" } as const;

type Check = { label: string; place?: true; ok: (r: Room, b: Branch) => boolean };

// 고객 조건 → 이름 붙은 검사 목록. 순서는 결과 없음 이유를 설명할 때의 순서(넓은 조건 → 좁은 조건)
function checks(c: SearchConditions): Check[] {
  const out: Check[] = [];
  if (c.region) out.push({ label: c.region, place: true, ok: (_, b) => b.region === c.region });
  if (c.area) out.push({ label: c.area, place: true, ok: (_, b) => b.areas.includes(c.area!) });
  // 36개월 이하 영유아는 인원수에 포함하지 않는다 (direction.md 3장 관찰 4)
  if (c.guests !== null) out.push({ label: `${c.guests}명 숙박 가능`, ok: (r) => c.guests! <= r.maxGuests });
  if (c.pet) out.push({ label: "반려동물 동반", ok: (r) => r.petAllowed });
  if (c.oceanView) out.push({ label: "오션뷰", ok: (r) => r.oceanView });
  if (c.minBedrooms !== null) out.push({ label: `방 ${c.minBedrooms}개 이상`, ok: (r) => r.bedrooms >= c.minBedrooms! });
  if (c.minBeds !== null) out.push({ label: `침대 ${c.minBeds}개 이상`, ok: (r) => bedCount(r) >= c.minBeds! });
  for (const f of c.features) out.push({ label: FEATURE_LABEL[f], ok: (r) => r.features.includes(f) });
  for (const f of c.facilities) out.push({ label: FACILITY_LABEL[f], ok: (r) => r.facilities.includes(f) });
  return out;
}

export function find(c: SearchConditions): Hit[] {
  const stays = candidateStays(c);
  const cs = checks(c);
  const hits: Hit[] = [];
  for (const room of ROOMS) {
    const branch = BRANCHES.find((b) => b.id === room.branchId)!;
    if (!cs.every((k) => k.ok(room, branch))) continue;
    if (!stays) { hits.push({ room, branch, stays: [] }); continue; }
    const ok = stays.filter((s) => available(room, s))
      .map((s) => ({ ...s, nights: diffDays(s.checkIn, s.checkOut), total: room.pricePerNight * diffDays(s.checkIn, s.checkOut) }));
    if (ok.length) hits.push({ room, branch, stays: ok });
  }
  return hits.sort((a, b) => a.room.pricePerNight - b.room.pricePerNight);
}

// 풀 수 있는 조건. check는 이 조건이 푸는 검사 이름(이유 설명용), 날짜는 null
type Option = { label: string; check: string | null; apply: (c: SearchConditions) => SearchConditions };

// 인원은 풀지 않는다(못 묵는 방을 권할 수 없다)
function relaxOptions(c: SearchConditions): Option[] {
  const opts: Option[] = [];
  // 정확한 날짜가 막혔으면 같은 박수로 이후 4주 안에서 찾는다
  if (c.checkIn && c.checkOut) {
    const nights = diffDays(c.checkIn, c.checkOut);
    const weekend = Array.from({ length: nights }, (_, i) => addDays(c.checkIn!, i)).some(isSaturday) || null;
    const range = { from: addDays(c.checkIn, 1), to: addDays(c.checkIn, 28) };
    opts.push({ label: "다른 날짜", check: null, apply: (x) => ({ ...x, checkIn: null, checkOut: null, dateRange: range, nights, weekend }) });
  }
  if (c.weekend) opts.push({ label: "주말 제외", check: null, apply: (x) => ({ ...x, weekend: null }) });
  if (c.area) opts.push({ label: `${c.area} 대신 ${c.region} 전체`, check: c.area, apply: (x) => ({ ...x, area: null }) });
  if (c.region) opts.push({ label: "다른 지역", check: c.area ?? c.region, apply: (x) => ({ ...x, region: null, area: null }) });
  if (c.pet) opts.push({ label: "반려동물 동반 제외", check: "반려동물 동반", apply: (x) => ({ ...x, pet: null }) });
  if (c.oceanView) opts.push({ label: "오션뷰 제외", check: "오션뷰", apply: (x) => ({ ...x, oceanView: null }) });
  if (c.minBedrooms !== null) opts.push({ label: `방 ${c.minBedrooms}개 조건 제외`, check: `방 ${c.minBedrooms}개 이상`, apply: (x) => ({ ...x, minBedrooms: null }) });
  if (c.minBeds !== null) opts.push({ label: `침대 ${c.minBeds}개 조건 제외`, check: `침대 ${c.minBeds}개 이상`, apply: (x) => ({ ...x, minBeds: null }) });
  for (const f of c.features) opts.push({ label: `${FEATURE_LABEL[f]} 제외`, check: FEATURE_LABEL[f], apply: (x) => ({ ...x, features: x.features.filter((y) => y !== f) }) });
  for (const f of c.facilities) opts.push({ label: `${FACILITY_LABEL[f]} 제외`, check: FACILITY_LABEL[f], apply: (x) => ({ ...x, facilities: x.facilities.filter((y) => y !== f) }) });
  return opts;
}

const MAX_RELAX = 3; // ponytail: 조합을 전부 시도한다(조건 n개면 최대 C(n,3)). 조건이 수십 개가 되면 탐욕 탐색으로 바꾼다

function subsets<T>(xs: T[], k: number): T[][] {
  if (k === 0) return [[]];
  return xs.flatMap((x, i) => subsets(xs.slice(i + 1), k - 1).map((rest) => [x, ...rest]));
}

// 결과가 나오는 최소 조합: 작은 조합부터 시도하고, 이미 찾은 조합을 포함하는 큰 조합은 건너뛴다
function minimalRelaxations(c: SearchConditions): { options: Option[]; conditions: SearchConditions; count: number }[] {
  const opts = relaxOptions(c);
  const found: { options: Option[]; conditions: SearchConditions; count: number }[] = [];
  for (let k = 1; k <= Math.min(MAX_RELAX, opts.length); k++) {
    for (const set of subsets(opts, k)) {
      if (found.some((f) => f.options.every((o) => set.includes(o)))) continue;
      const conditions = set.reduce((x, o) => o.apply(x), c);
      const count = find(conditions).length;
      if (count) found.push({ options: set, conditions, count });
    }
  }
  return found;
}

const roomsWith = (c: SearchConditions) => ROOMS.map((room) => ({ room, branch: BRANCHES.find((b) => b.id === room.branchId)! }))
  .filter(({ room, branch }) => checks(c).every((k) => k.ok(room, branch)));

// 조건 하나가 왜 막혔는지. ctx는 같은 조합의 다른 조건을 이미 푼 상태라, 이 조건만 풀면 결과가 나온다
function reasonFor(o: Option, ctx: SearchConditions): string {
  const all = checks(ctx);
  if (o.check === null) return `나머지 조건에 맞는 객실 ${roomsWith(o.apply(ctx)).length}실이 그 날짜에 모두 예약이 찼어요.`;
  const k = all.find((x) => x.label === o.check)!;
  const rooms = ROOMS.map((room) => ({ room, branch: BRANCHES.find((b) => b.id === room.branchId)! })).filter(({ room, branch }) => k.ok(room, branch));
  if (!rooms.length) return k.place ? `${k.label}에는 지점이 없어요.` : `'${k.label}' 객실이 없어요.`;
  const subject = k.place ? `${k.label} 객실 ${rooms.length}실` : `'${k.label}' 객실 ${rooms.length}실`;
  const common = all.filter((x) => x !== k && rooms.every(({ room, branch }) => !x.ok(room, branch))).map((x) => x.label);
  if (common.length) return `${subject}은 모두 ${common.join(", ")} 조건에 맞지 않아요.`;
  if (candidateStays(ctx)) return `${subject}은 그 날짜에 예약이 찼어요.`;
  return `${subject}은 나머지 조건과 함께 맞는 방이 없어요.`;
}

// 조건을 순서대로 적용하며 남는 객실 수. 마지막 단계는 예약 가능 여부
export function funnel(c: SearchConditions): Step[] {
  let rooms = ROOMS.map((room) => ({ room, branch: BRANCHES.find((b) => b.id === room.branchId)! }));
  const steps: Step[] = [{ label: "전체", count: rooms.length }];
  for (const k of checks(c)) {
    rooms = rooms.filter(({ room, branch }) => k.ok(room, branch));
    steps.push({ label: k.label, count: rooms.length, place: k.place });
  }
  if (candidateStays(c)) steps.push({ label: "해당 날짜 예약 가능", count: find(c).length });
  return steps;
}

// 풀 수 있는 조건을 다 풀어도 없을 때(인원이 너무 많을 때 등): 0건이 된 첫 단계를 말한다
export function explain(steps: Step[]): string | null {
  const i = steps.findIndex((s) => s.count === 0);
  if (i < 1) return null;
  const prev = steps[i - 1];
  const before = steps.slice(1, i).map((s) => s.label).join(", ");
  if (steps[i].place) return `${steps[i].label}에는 지점이 없어요.`;
  if (steps[i].label === "해당 날짜 예약 가능") return `${before ? `${before} 조건에 맞는 ` : ""}객실 ${prev.count}실이 모두 해당 날짜에 예약이 찼어요.`;
  return before
    ? `${before} 조건에 맞는 객실 ${prev.count}실 중 '${steps[i].label}' 객실이 없어요.`
    : `'${steps[i].label}' 조건에 맞는 객실이 없어요.`;
}

// 이유와 대안 문장은 코드가 만든다(LLM이 없는 객실이나 재고를 말하지 않게)
export function search(c: SearchConditions): SearchResult {
  const hits = find(c);
  const datesKnown = candidateStays(c) !== null;
  if (hits.length) return { hits, datesKnown, relaxations: [], reasons: [] };
  const relaxations = minimalRelaxations(c).map((f) => ({
    labels: f.options.map((o) => o.label),
    reasons: [...new Set(f.options.map((o) => reasonFor(o, f.options.filter((x) => x !== o).reduce((x, y) => y.apply(x), c))))],
    conditions: f.conditions,
    count: f.count,
  }));
  const reasons = relaxations.length ? [] : [explain(funnel(c)) ?? "조건에 맞는 객실이 없어요."];
  return { hits, datesKnown, relaxations, reasons };
}
