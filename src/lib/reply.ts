// 상담원 답변과 조건 칩. 문장은 코드가 만든다: LLM이 없는 객실·가격을 말하지 않게 (direction.md 4장).
// 답변 형식은 평가셋 여러 턴 케이스(m01~m10)의 상담원 발화와 같게 맞춘다. 다음 추출의 입력이 되기 때문이다.
import { FACILITY_LABEL, FEATURE_LABEL, josa, md, type SearchResult } from "./search";
import type { SearchConditions } from "./schema";

const DAY = "일월화수목금토";
const dow = (d: string) => DAY[new Date(`${d}T00:00:00Z`).getUTCDay()];
export const mdw = (d: string) => `${md(d)}(${dow(d)})`;

// "10월 23일(금)~24일(토)" / 월이 바뀌면 "10월 31일(토)~11월 1일(일)"
export function stayText(checkIn: string, checkOut: string): string {
  const end = checkIn.slice(5, 7) === checkOut.slice(5, 7) ? `${Number(checkOut.slice(8))}일(${dow(checkOut)})` : mdw(checkOut);
  return `${mdw(checkIn)}~${end}`;
}

export function datesText(c: SearchConditions): string | null {
  if (c.checkIn && c.checkOut) return stayText(c.checkIn, c.checkOut);
  if (!c.dateRange) return null;
  const { from, to } = c.dateRange;
  const range = from.slice(5, 7) === to.slice(5, 7) ? `${md(from)}~${Number(to.slice(8))}일` : `${md(from)}~${md(to)}`;
  return `${range} 중${c.nights ? ` ${c.nights}박` : ""}${c.weekend ? " 주말 포함" : ""}`;
}

export function guestsText(c: SearchConditions): string | null {
  if (c.guests === null) return null;
  return `${c.guests}명${c.infants ? `, 영유아 ${c.infants}명` : ""}`;
}

export type Chip = { key: string; label: string; say: string; patch: Partial<SearchConditions> };

// 날짜·인원·지역은 요약 줄에서 보여주고, 나머지 조건을 칩으로. ×를 누르면 say를 대화에 남기고 patch로 다시 검색한다
export function chips(c: SearchConditions): Chip[] {
  const out: Chip[] = [];
  if (c.pet) out.push({ key: "pet", label: "반려동물 동반", say: "반려동물은 데려가지 않을게요", patch: { pet: null } });
  if (c.oceanView) out.push({ key: "oceanView", label: "오션뷰", say: "오션뷰가 아니어도 괜찮아요", patch: { oceanView: null } });
  if (c.minBedrooms !== null) out.push({ key: "minBedrooms", label: `방 ${c.minBedrooms}개 이상`, say: "방 개수는 상관없어요", patch: { minBedrooms: null } });
  if (c.minBeds !== null) out.push({ key: "minBeds", label: `침대 ${c.minBeds}개 이상`, say: "침대 개수는 상관없어요", patch: { minBeds: null } });
  for (const f of c.features)
    out.push({ key: f, label: FEATURE_LABEL[f], say: `${josa(FEATURE_LABEL[f], "은", "는")} 없어도 괜찮아요`, patch: { features: c.features.filter((x) => x !== f) } });
  for (const f of c.facilities)
    out.push({ key: f, label: FACILITY_LABEL[f], say: `${josa(FACILITY_LABEL[f], "은", "는")} 없어도 괜찮아요`, patch: { facilities: c.facilities.filter((x) => x !== f) } });
  return out;
}

const place = (c: SearchConditions) => c.area ?? c.region;

export function reply(c: SearchConditions, r: SearchResult): string {
  const ask = [c.needsClarification.includes("dates") && "언제", c.needsClarification.includes("guests") && "몇 분이"].filter(Boolean);
  if (ask.length) return `${ask.join(", ")} 묵으실 예정인가요?`;
  const where = place(c) ? `${place(c)}에서 ` : "";
  const scope = place(c) ? "" : " 전 지역에서";
  const base = `${where}${datesText(c)}, ${c.guests}명 기준으로${scope}`;
  if (r.hits.length) return `${base} 찾았어요.`;
  return `${base} 찾았지만 조건에 맞는 객실이 없어요.`;
}
