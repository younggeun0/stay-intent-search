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
  checkIn: isoDate.nullable(), // 날짜가 특정될 때만
  checkOut: isoDate.nullable(),
  dateRange: z.object({ from: isoDate, to: isoDate }).nullable(), // 기간으로 말했을 때: 체크인 가능한 날짜 범위
  nights: z.number().int().positive().nullable(), // 기간 검색에서 몇 박인지 (날짜가 특정되면 null)
  weekend: z.boolean().nullable(), // 기간 검색에서 토요일 숙박을 포함해야 하는지
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

export const Turn = z.object({ role: z.enum(["user", "assistant"]), text: z.string() });
export type Turn = z.infer<typeof Turn>;

export const EvalCase = z.object({
  id: z.string(),
  split: z.enum(["dev", "holdout"]),
  referenceDate: isoDate,
  input: z.union([z.string(), z.array(Turn)]), // 여러 턴이면 대화 전체. 정답은 마지막 턴까지 누적된 조건
  expected: SearchConditions,
  tags: z.array(z.string()),
});
export type EvalCase = z.infer<typeof EvalCase>;

const bed = z.object({ type: z.string(), count: z.number().int().positive() });

// 저장하는 사양. 전망·펫·욕조 등 이름 기반 속성은 저장하지 않고 이름에서 파생한다 (src/lib/inventory.ts)
export const RoomSpec = z.object({
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
  pricePerNight: z.number().int().positive(), // 가짜 값
  blocked: z.array(z.object({ from: isoDate, to: isoDate })), // 가짜 재고: 이 기간에 걸친 숙박은 불가 [from, to)
  // observed: 상세 창 사양 전체를 봄 / capacity: 인원만 봄 / estimated: 객실 유형으로 추정
  specSource: z.enum(["observed", "capacity", "estimated"]),
});
export type RoomSpec = z.infer<typeof RoomSpec>;

export type Room = RoomSpec & {
  oceanView: boolean;
  features: (typeof ROOM_FEATURES)[number][];
  petAllowed: boolean;
};

export const Branch = z.object({
  id: z.string(), // 확인한 지점은 사이트 URL slug, 나머지는 임의 id
  name: z.string(),
  region: z.enum(REGIONS),
  areas: z.array(z.string()), // 고객이 부를 법한 이름: 로이움은 서초구지만 지점명이 "강남"
});
export type Branch = z.infer<typeof Branch>;
