import type { SearchConditions } from "../src/lib/schema";

export type Field = keyof SearchConditions;
export const FIELDS = [
  "region", "area", "checkIn", "checkOut", "dateRange", "nights", "weekend", "guests", "infants",
  "pet", "oceanView", "minBedrooms", "minBeds", "features", "facilities", "needsClarification", "unhandled",
] as const satisfies readonly Field[];

const norm = (f: Field, v: unknown): unknown => {
  if (f === "unhandled") return (v as string[]).length > 0; // 내용이 아니라 비었는지만 본다
  if (Array.isArray(v)) return [...v].sort();
  return v;
};

/** 틀린 필드 목록. 빈 배열이면 케이스 정답. */
export function wrongFields(expected: SearchConditions, actual: SearchConditions): Field[] {
  return FIELDS.filter((f) => JSON.stringify(norm(f, expected[f])) !== JSON.stringify(norm(f, actual[f])));
}

/** 되묻기 오류 분류: 물어야 할 것을 안 물음(missed) / 안 물어도 될 것을 물음(extra) */
export function clarifyErrors(expected: SearchConditions, actual: SearchConditions) {
  const e = new Set(expected.needsClarification);
  const a = new Set(actual.needsClarification);
  return { missed: [...e].filter((x) => !a.has(x)), extra: [...a].filter((x) => !e.has(x)) };
}
