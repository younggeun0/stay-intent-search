import type { SearchConditions } from "./schema";

// 결정적으로 정할 수 있는 것은 모델이 아니라 코드가 정한다.
// 날짜가 특정되면 기간 검색 필드는 의미가 없으므로 비운다 (모델은 박수를 채워 넣는 경향이 있다: eval v0)
// 되묻기도 규칙상 추출 결과에서 결정되므로 코드가 계산한다(eval v1: 모델이 판단하면 과잉 되묻기)
export function normalize(raw: SearchConditions): SearchConditions {
  const c = { ...raw };
  if (c.checkIn && c.checkOut) Object.assign(c, { dateRange: null, nights: null, weekend: null });
  // "없음"을 0/false로 답해도 검색 의미는 null과 같다
  if (c.infants === 0) c.infants = null;
  for (const k of ["pet", "oceanView", "weekend"] as const) if (c[k] === false) c[k] = null;
  if (c.area === c.region) c.area = null;
  const ask: SearchConditions["needsClarification"] = [];
  if (!c.checkIn && !c.dateRange) ask.push("dates");
  if (c.guests === null) ask.push("guests");
  return { ...c, needsClarification: ask };
}
