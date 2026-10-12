import { z } from "zod";

// 사이트 검색 폼의 지역 선택지 그대로 (docs/evidence/01-home-search.jpg)
export const REGIONS = ["서울", "경기", "인천", "부산", "강원", "제주", "울산", "당진"] as const;

// 객실 이름에만 있는 속성 (direction.md 3b)
export const ROOM_FEATURES = ["bathtub", "spa", "twin", "barrierFree", "loft", "connecting"] as const;

// 상세 창 시설 태그 중 고객이 조건으로 말할 법한 것만 (direction.md 3a)
export const FACILITIES = ["kitchen", "washer", "dishwasher", "desk", "styler"] as const;

export const CLARIFY_FIELDS = ["dates", "guests"] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * 자연어 → 검색 조건. LLM 출력, 평가셋 정답, 검색 입력이 모두 이 스키마를 쓴다.
 * 언급되지 않은 조건은 null(배열은 빈 배열)이다. 기본값을 채우지 않는다.
 * 해석 규칙은 eval/README.md.
 */
export const SearchConditions = z.object({
  region: z.enum(REGIONS).nullable(),
  area: z.string().nullable(), // 시·구 단위, 접미사 없이: "속초", "해운대", "강남"
  checkIn: isoDate.nullable(),
  checkOut: isoDate.nullable(),
  guests: z.number().int().positive().nullable(), // 인원수에 포함되는 사람 (36개월 이하 제외)
  infants: z.number().int().nonnegative().nullable(), // 36개월 이하
  pet: z.boolean().nullable(),
  oceanView: z.boolean().nullable(),
  minBedrooms: z.number().positive().nullable(), // 1.5룸 → 1.5
  minBeds: z.number().int().positive().nullable(),
  features: z.array(z.enum(ROOM_FEATURES)),
  facilities: z.array(z.enum(FACILITIES)),
  needsClarification: z.array(z.enum(CLARIFY_FIELDS)),
  unhandled: z.array(z.string()), // 스키마로 표현 못 하는 조건 원문 (예: "주차 무료")
});
export type SearchConditions = z.infer<typeof SearchConditions>;

export const EvalCase = z.object({
  id: z.string(),
  split: z.enum(["dev", "holdout"]),
  referenceDate: isoDate,
  input: z.string(),
  expected: SearchConditions,
  tags: z.array(z.string()),
});
export type EvalCase = z.infer<typeof EvalCase>;

const bed = z.object({ type: z.string(), count: z.number().int().positive() });

export const Room = z.object({
  id: z.string(),
  branchId: z.string(),
  name: z.string(), // 사이트 표기 그대로
  baseGuests: z.number().int().positive(),
  maxGuests: z.number().int().positive(),
  sizeM2: z.number().positive().nullable(),
  bedrooms: z.number().positive(),
  beds: z.array(bed),
  bathrooms: z.number().int().positive(),
  facilities: z.array(z.enum(FACILITIES)),
  oceanView: z.boolean(),
  features: z.array(z.enum(ROOM_FEATURES)),
  petAllowed: z.boolean(),
  pricePerNight: z.number().int().positive(), // 가짜 값
  blocked: z.array(z.object({ from: isoDate, to: isoDate })), // 가짜 재고: [from, to) 예약 불가
  specSource: z.enum(["observed", "estimated"]), // 상세 창에서 직접 본 사양인지
});
export type Room = z.infer<typeof Room>;

export const Branch = z.object({
  id: z.string(), // 사이트 URL slug
  name: z.string(),
  region: z.enum(REGIONS),
  area: z.string(),
});
export type Branch = z.infer<typeof Branch>;
