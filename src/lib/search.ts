// 검색 조건 → 객실과 가능한 숙박 일정. LLM 없이 결정적으로 동작한다 (direction.md 4장).
// 데이터 소스를 PMS로 바꾸면 이 파일만 교체한다 (direction.md 10장).
import { BRANCHES, ROOMS } from "./inventory";
import type { Branch, Room, SearchConditions } from "./schema";

export type Stay = { checkIn: string; checkOut: string; nights: number; total: number };
export type Hit = { room: Room; branch: Branch; stays: Stay[] }; // 날짜 미정이면 stays는 []
type Relaxation = { labels: string[]; says: string[]; reasons: string[]; conditions: SearchConditions; count: number }; // labels를 모두 바꾸면 count실, reasons는 각 조건이 막힌 이유
type Step = { label: string; count: number; place?: true }; // 이 조건까지 적용했을 때 남는 객실 수
export type SearchResult = { hits: Hit[]; datesKnown: boolean; relaxations: Relaxation[]; reasons: string[] }; // reasons는 대안이 하나도 없을 때만

export const DAY_MS = 86_400_000;
export const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
const diffDays = (a: string, b: string) => (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS;
// 받침 있으면 a, 없으면 b (은/는, 이/가). 한글 음절은 "가"(U+AC00)부터 11172자, 한 초성·중성마다 받침 28가지(0번은 받침 없음)
const HANGUL_FIRST = 0xac00, HANGUL_COUNT = 11172, JONGSEONG_COUNT = 28;
export const josa = (w: string, a: string, b: string) => { const c = w.charCodeAt(w.length - 1) - HANGUL_FIRST; return c >= 0 && c < HANGUL_COUNT && c % JONGSEONG_COUNT ? w + a : w + b; };
export const md = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8))}일`;
const isSaturday = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay() === 6;
// 주말 포함 = 토요일 밤을 묵는다
const hasSaturdayNight = (checkIn: string, nights: number) => Array.from({ length: nights }, (_, i) => addDays(checkIn, i)).some(isSaturday);

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
    if (c.weekend && !hasSaturdayNight(d, nights)) continue;
    out.push(stay);
  }
  return out;
}

// 예약 불가 기간 [from, to)과 숙박 [checkIn, checkOut)이 겹치면 불가
const available = (r: Room, s: { checkIn: string; checkOut: string }) =>
  r.blocked.every((b) => s.checkOut <= b.from || b.to <= s.checkIn);

export const FEATURE_LABEL = { bathtub: "욕조", spa: "스파", twin: "트윈", barrierFree: "베리어프리", loft: "복층", connecting: "커넥팅" } as const;
export const FACILITY_LABEL = { kitchen: "주방", washer: "세탁기", dishwasher: "식기세척기", desk: "업무용 책상", styler: "스타일러" } as const;

// 뺄 수 있는 조건의 라벨과, 뺄 때 고객 발화로 남기는 문장. 검사(checks)·대안(relaxOptions)·칩(reply.ts chips)이 같은 값을 써야 한다:
// 대안의 check는 검사 라벨로 찾고, 발화는 다음 추출의 입력이라 문장이 바뀌면 eval:roundtrip을 다시 돌린다
export const LABEL = { pet: "반려동물 동반", oceanView: "오션뷰", bedrooms: (n: number) => `방 ${n}개 이상`, beds: (n: number) => `침대 ${n}개 이상` };
export const SAY = {
  pet: "반려동물은 데려가지 않을게요",
  oceanView: "오션뷰가 아니어도 괜찮아요",
  bedrooms: "방 개수는 상관없어요",
  beds: "침대 개수는 상관없어요",
  without: (label: string) => `${josa(label, "은", "는")} 없어도 괜찮아요`,
};

type Check = { label: string; place?: true; ok: (r: Room, b: Branch) => boolean };

// 고객 조건 → 이름 붙은 검사 목록. 순서는 결과 없음 이유를 설명할 때의 순서(넓은 조건 → 좁은 조건)
function checks(c: SearchConditions): Check[] {
  const out: Check[] = [];
  if (c.region) out.push({ label: c.region, place: true, ok: (_, b) => b.region === c.region });
  if (c.area) out.push({ label: c.area, place: true, ok: (_, b) => b.areas.includes(c.area!) });
  // 36개월 이하 영유아는 인원수에 포함하지 않는다 (direction.md 3장 관찰 4)
  if (c.guests !== null) out.push({ label: `${c.guests}명 숙박 가능`, ok: (r) => c.guests! <= r.maxGuests });
  if (c.pet) out.push({ label: LABEL.pet, ok: (r) => r.petAllowed });
  if (c.oceanView) out.push({ label: LABEL.oceanView, ok: (r) => r.oceanView });
  if (c.minBedrooms !== null) out.push({ label: LABEL.bedrooms(c.minBedrooms), ok: (r) => r.bedrooms >= c.minBedrooms! });
  if (c.minBeds !== null) out.push({ label: LABEL.beds(c.minBeds), ok: (r) => bedCount(r) >= c.minBeds! });
  for (const f of c.features) out.push({ label: FEATURE_LABEL[f], ok: (r) => r.features.includes(f) });
  for (const f of c.facilities) out.push({ label: FACILITY_LABEL[f], ok: (r) => r.facilities.includes(f) });
  return out;
}

// 객실과 그 지점. 인벤토리는 고정이라 한 번만 만든다
const PAIRS = ROOMS.map((room) => ({ room, branch: BRANCHES.find((b) => b.id === room.branchId)! }));

export function find(c: SearchConditions): Hit[] {
  const stays = candidateStays(c);
  const cs = checks(c);
  const hits: Hit[] = [];
  for (const { room, branch } of PAIRS) {
    if (!cs.every((k) => k.ok(room, branch))) continue;
    if (!stays) { hits.push({ room, branch, stays: [] }); continue; }
    const ok = stays.filter((s) => available(room, s))
      .map((s) => ({ ...s, nights: diffDays(s.checkIn, s.checkOut), total: room.pricePerNight * diffDays(s.checkIn, s.checkOut) }));
    if (ok.length) hits.push({ room, branch, stays: ok });
  }
  return hits.sort((a, b) => a.room.pricePerNight - b.room.pricePerNight);
}

// 풀 수 있는 조건. check는 이 조건이 푸는 검사 이름(이유 설명용), 날짜는 null
// say는 이 조건을 고객이 직접 바꾼다면 할 말. 버튼을 누르면 대화에 남겨 다음 추출에도 반영되게 한다
type Option = { label: string; say: string; check: string | null; apply: (c: SearchConditions) => SearchConditions };

const RELAX_DAYS = 28;

// 인원은 풀지 않는다(못 묵는 방을 권할 수 없다)
function relaxOptions(c: SearchConditions): Option[] {
  const opts: Option[] = [];
  // 정확한 날짜가 막혔으면 같은 박수로 이후 RELAX_DAYS(4주) 안에서 찾는다
  if (c.checkIn && c.checkOut) {
    const nights = diffDays(c.checkIn, c.checkOut);
    const weekend = hasSaturdayNight(c.checkIn, nights) || null;
    const range = { from: addDays(c.checkIn, 1), to: addDays(c.checkIn, RELAX_DAYS) };
    opts.push({ label: "다른 날짜", say: `${md(range.from)}~${md(range.to)} 사이 ${weekend ? "주말 " : ""}${nights}박이면 괜찮아요`, check: null, apply: (x) => ({ ...x, checkIn: null, checkOut: null, dateRange: range, nights, weekend }) });
  }
  if (c.weekend) opts.push({ label: "주말 제외", say: "주말이 아니어도 괜찮아요", check: null, apply: (x) => ({ ...x, weekend: null }) });
  if (c.area) opts.push({ label: `${c.area} 대신 ${c.region} 전체`, say: `${c.region} 어디든 괜찮아요`, check: c.area, apply: (x) => ({ ...x, area: null }) });
  if (c.region) opts.push({ label: "다른 지역", say: "지역은 어디든 상관없어요", check: c.area ?? c.region, apply: (x) => ({ ...x, region: null, area: null }) });
  if (c.pet) opts.push({ label: "반려동물 동반 제외", say: SAY.pet, check: LABEL.pet, apply: (x) => ({ ...x, pet: null }) });
  if (c.oceanView) opts.push({ label: "오션뷰 제외", say: SAY.oceanView, check: LABEL.oceanView, apply: (x) => ({ ...x, oceanView: null }) });
  if (c.minBedrooms !== null) opts.push({ label: `방 ${c.minBedrooms}개 조건 제외`, say: SAY.bedrooms, check: LABEL.bedrooms(c.minBedrooms), apply: (x) => ({ ...x, minBedrooms: null }) });
  if (c.minBeds !== null) opts.push({ label: `침대 ${c.minBeds}개 조건 제외`, say: SAY.beds, check: LABEL.beds(c.minBeds), apply: (x) => ({ ...x, minBeds: null }) });
  for (const f of c.features) opts.push({ label: `${FEATURE_LABEL[f]} 제외`, say: SAY.without(FEATURE_LABEL[f]), check: FEATURE_LABEL[f], apply: (x) => ({ ...x, features: x.features.filter((y) => y !== f) }) });
  for (const f of c.facilities) opts.push({ label: `${FACILITY_LABEL[f]} 제외`, say: SAY.without(FACILITY_LABEL[f]), check: FACILITY_LABEL[f], apply: (x) => ({ ...x, facilities: x.facilities.filter((y) => y !== f) }) });
  return opts;
}

const MAX_RELAX = 3; // ponytail: 조합을 전부 시도한다(조건 n개면 C(n,1)+C(n,2)+C(n,3)개). 조건이 수십 개가 되면 탐욕 탐색으로 바꾼다

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

const roomsWith = (c: SearchConditions) => {
  const cs = checks(c);
  return PAIRS.filter(({ room, branch }) => cs.every((k) => k.ok(room, branch)));
};

// 조건 하나가 왜 막혔는지. ctx는 같은 조합의 다른 조건을 이미 푼 상태라, 이 조건만 풀면 결과가 나온다
function reasonFor(o: Option, ctx: SearchConditions): string {
  const all = checks(ctx);
  if (o.check === null) return `나머지 조건에 맞는 객실 ${roomsWith(o.apply(ctx)).length}실이 그 날짜에 모두 예약이 찼어요.`;
  const k = all.find((x) => x.label === o.check)!;
  const rooms = PAIRS.filter(({ room, branch }) => k.ok(room, branch));
  if (!rooms.length) return k.place ? `${k.label}에는 지점이 없어요.` : `'${k.label}' 객실이 없어요.`;
  // 1~2실이면 어떤 방인지 밝힌다: 고객이 그 방에 맞춰 조건을 바꿀 수 있게
  const which = rooms.length <= 2 ? `(${rooms.map(({ room, branch }) => `${branch.name} ${room.name}, ${branch.region}, 최대 ${room.maxGuests}인`).join(" / ")})` : "";
  const subject = k.place ? `${k.label} 객실 ${rooms.length}실${which}` : `'${k.label}' 객실 ${rooms.length}실${which}`;
  const common = all.filter((x) => x !== k && rooms.every(({ room, branch }) => !x.ok(room, branch))).map((x) => x.label);
  if (common.length) return `${subject}은${rooms.length > 1 ? " 모두" : ""} ${common.join(", ")} 조건에 맞지 않아요.`;
  if (candidateStays(ctx)) return `${subject}은 그 날짜에 예약이 찼어요.`;
  return `${subject}은 나머지 조건과 함께 맞는 방이 없어요.`;
}

// 조건을 순서대로 적용하며 남는 객실 수. 마지막 단계는 예약 가능 여부
function funnel(c: SearchConditions): Step[] {
  let rooms = PAIRS;
  const steps: Step[] = [{ label: "전체", count: rooms.length }];
  for (const k of checks(c)) {
    rooms = rooms.filter(({ room, branch }) => k.ok(room, branch));
    steps.push({ label: k.label, count: rooms.length, place: k.place });
  }
  if (candidateStays(c)) steps.push({ label: "해당 날짜 예약 가능", count: find(c).length });
  return steps;
}

// 풀 수 있는 조건을 다 풀어도 없을 때(인원이 너무 많을 때 등): 0건이 된 첫 단계를 말한다
function explain(steps: Step[]): string | null {
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
    says: f.options.map((o) => o.say),
    reasons: [...new Set(f.options.map((o) => reasonFor(o, f.options.filter((x) => x !== o).reduce((x, y) => y.apply(x), c))))],
    conditions: f.conditions,
    count: f.count,
  }));
  const reasons = relaxations.length ? [] : [explain(funnel(c)) ?? "조건에 맞는 객실이 없어요."];
  return { hits, datesKnown, relaxations, reasons };
}
