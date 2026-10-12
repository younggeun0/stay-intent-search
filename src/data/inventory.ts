// 목업 인벤토리. 지점명과 객실명은 공개 사이트에서 관찰한 실제 표기다 (2026-10-13, 홈 큐레이션 목록과 지점 상세).
// 사양은 specSource로 출처를 구분한다. 가격과 예약 불가 기간(blocked)은 전부 가짜 값이다.
import type { Branch, RoomSpec } from "@/lib/schema";

export const branches: Branch[] = [
  { id: "gangnam-sac-signity", name: "르컬렉티브 강남 예술의전당 시그니티", region: "서울", areas: ["강남", "서초"] },
  { id: "gangnam-sac-roium", name: "르컬렉티브 강남 예술의전당 로이움", region: "서울", areas: ["강남", "서초"] },
  { id: "ikseon", name: "어반스테이 부티크 익선", region: "서울", areas: ["종로", "익선"] },
  { id: "busan-station", name: "르컬렉티브 부산역", region: "부산", areas: ["동구"] },
  { id: "haeundae-station", name: "어반스테이 해운대역", region: "부산", areas: ["해운대"] },
  { id: "haeundae-paragraph", name: "르컬렉티브 해운대 패러그라프", region: "부산", areas: ["해운대"] },
  { id: "busan-gijang", name: "르컬렉티브 부산기장", region: "부산", areas: ["기장"] },
  { id: "sokcho-beach-c", name: "어반스테이 속초해변C", region: "강원", areas: ["속초"] },
  { id: "plott-sokcho", name: "플라트 더 원 속초자이엘라 더 비치", region: "강원", areas: ["속초"] },
  { id: "plott-yangyang", name: "플라트 더 각 양양", region: "강원", areas: ["양양"] },
  { id: "siheung-wavepark", name: "르컬렉티브 시흥 웨이브파크", region: "경기", areas: ["시흥"] },
  { id: "gapyeong", name: "오버더마운틴 가평", region: "경기", areas: ["가평"] },
  { id: "songdo", name: "어반스테이 송도달빛공원", region: "인천", areas: ["송도", "연수"] },
  { id: "incheon-chinatown", name: "어반스테이 인천차이나타운", region: "인천", areas: ["중구", "차이나타운"] },
  { id: "jeju-airport", name: "어반스테이 제주공항", region: "제주", areas: ["제주"] },
];

type Template = Omit<RoomSpec, "id" | "branchId" | "name" | "blocked" | "specSource">;

// 객실 유형별 추정 사양. 쓰리룸은 부산역 "패밀리 쓰리룸 G 파노라마", 스위트는 "프리미어 스위트 와이드" 관찰값을 따랐다.
const T = {
  studio: { baseGuests: 2, maxGuests: 2, sizeM2: 33, bedrooms: 1, beds: [{ type: "퀸", count: 1 }], bathrooms: 1, facilities: ["kitchen", "washer"], pricePerNight: 150000 },
  loft: { baseGuests: 2, maxGuests: 4, sizeM2: 40, bedrooms: 1, beds: [{ type: "퀸", count: 1 }, { type: "싱글", count: 1 }], bathrooms: 1, facilities: ["kitchen", "washer"], pricePerNight: 180000 },
  suite: { baseGuests: 2, maxGuests: 4, sizeM2: 66, bedrooms: 1.5, beds: [{ type: "킹", count: 1 }], bathrooms: 1, facilities: ["kitchen", "washer", "desk"], pricePerNight: 220000 },
  suiteTwin: { baseGuests: 2, maxGuests: 2, sizeM2: 66, bedrooms: 1.5, beds: [{ type: "싱글", count: 2 }], bathrooms: 1, facilities: ["kitchen", "washer", "desk"], pricePerNight: 220000 },
  suiteFamily: { baseGuests: 3, maxGuests: 4, sizeM2: 66, bedrooms: 1.5, beds: [{ type: "킹", count: 1 }, { type: "싱글", count: 1 }], bathrooms: 1, facilities: ["kitchen", "washer", "desk"], pricePerNight: 250000 },
  twoRoom: { baseGuests: 4, maxGuests: 6, sizeM2: 83, bedrooms: 2, beds: [{ type: "킹", count: 1 }, { type: "퀸", count: 1 }], bathrooms: 2, facilities: ["kitchen", "washer", "desk"], pricePerNight: 320000 },
  threeRoom: { baseGuests: 6, maxGuests: 8, sizeM2: 166, bedrooms: 3, beds: [{ type: "킹", count: 2 }, { type: "슈퍼싱글", count: 1 }, { type: "토퍼", count: 1 }], bathrooms: 2, facilities: ["kitchen", "washer", "dishwasher", "desk"], pricePerNight: 450000 },
} satisfies Record<string, Template>;

type Extra = Partial<Omit<RoomSpec, "id" | "branchId" | "name">>;
let seq = 0;
const room = (branchId: string, name: string, t: Template, extra: Extra = {}): RoomSpec => ({
  id: `r${String(++seq).padStart(2, "0")}`, branchId, name, ...t, blocked: [], specSource: "estimated", ...extra,
});

export const roomSpecs: RoomSpec[] = [
  room("gangnam-sac-signity", "프리미어 스위트 (욕조)", T.suite),
  room("gangnam-sac-signity", "프리미어 스위트 패밀리", T.suiteFamily),
  room("gangnam-sac-signity", "프리미어 스위트 W", T.suite),
  room("gangnam-sac-signity", "패밀리 투룸", T.twoRoom),

  // 로이움: 인원은 지점 상세에서 관찰 (기준/최대 모두 2인, 투룸은 4인)
  room("gangnam-sac-roium", "스튜디오 베리어프리", T.studio, { specSource: "capacity" }),
  room("gangnam-sac-roium", "스튜디오", T.studio, { specSource: "capacity" }),
  room("gangnam-sac-roium", "프리미어 스위트", { ...T.suite, maxGuests: 2 }, { specSource: "capacity" }),
  room("gangnam-sac-roium", "패밀리 투룸", { ...T.twoRoom, maxGuests: 4 }, { specSource: "capacity" }),

  room("ikseon", "패밀리 투룸", T.twoRoom),

  // 부산역: 와이드와 파노라마는 상세 창 사양 전체 관찰, 나머지는 인원만 관찰
  room("busan-station", "프리미어 스위트 와이드", { ...T.suite, facilities: ["kitchen", "washer", "desk", "styler"] }, { specSource: "observed" }),
  room("busan-station", "프리미어 스위트 G 커넥팅", { ...T.suiteFamily, baseGuests: 4, maxGuests: 6 }, { specSource: "capacity" }),
  room("busan-station", "패밀리 투룸 G", T.twoRoom, { specSource: "capacity" }),
  room("busan-station", "패밀리 쓰리룸 G", { ...T.threeRoom, baseGuests: 4, maxGuests: 6 }, { specSource: "capacity" }),
  room("busan-station", "패밀리 쓰리룸 G 파노라마", { ...T.threeRoom, facilities: ["kitchen", "washer", "dishwasher", "desk", "styler"] }, { specSource: "observed" }),

  room("haeundae-station", "프리미어 스위트", T.suite),
  room("haeundae-station", "프리미어 스위트 패밀리", T.suiteFamily),
  room("haeundae-station", "프리미어 스위트 패밀리 오션", T.suiteFamily, { pricePerNight: 290000 }),
  room("haeundae-station", "프리미어 스위트 오션", T.suite, { pricePerNight: 260000, blocked: [{ from: "2026-10-23", to: "2026-10-25" }] }),
  room("haeundae-station", "프리미어 스위트 트윈", T.suiteTwin),

  room("haeundae-paragraph", "패밀리 투룸", T.twoRoom),
  room("haeundae-paragraph", "패밀리 쓰리룸", T.threeRoom),

  room("busan-gijang", "패밀리 투룸", T.twoRoom),
  room("busan-gijang", "패밀리 투룸 오션", T.twoRoom, { pricePerNight: 360000 }),
  room("busan-gijang", "패밀리 쓰리룸", T.threeRoom),
  room("busan-gijang", "패밀리 쓰리룸 오션", T.threeRoom, { pricePerNight: 500000 }),

  room("sokcho-beach-c", "프리미어 스위트 코너", T.suite),
  room("sokcho-beach-c", "프리미어 스위트 오션", T.suite, { pricePerNight: 260000 }),
  room("sokcho-beach-c", "패밀리 투룸 오션", T.twoRoom, { pricePerNight: 360000 }),

  room("plott-sokcho", "프리미어 스위트", T.suite),
  room("plott-sokcho", "프리미어 스위트 오션", T.suite, { pricePerNight: 260000, blocked: [{ from: "2026-10-17", to: "2026-10-18" }] }),
  room("plott-sokcho", "스튜디오 와이드 오션", T.studio, { pricePerNight: 190000 }),
  room("plott-sokcho", "패밀리 투룸 파노라마 오션", T.twoRoom, { pricePerNight: 380000 }),

  room("plott-yangyang", "프리미어 스위트", T.suite),
  room("plott-yangyang", "프리미어 스위트 로프트 오션", { ...T.suite, beds: [{ type: "킹", count: 1 }, { type: "싱글", count: 1 }] }, { pricePerNight: 280000 }),
  room("plott-yangyang", "프리미어 스위트 로프트 스파", { ...T.suite, beds: [{ type: "킹", count: 1 }, { type: "싱글", count: 1 }] }, { pricePerNight: 300000 }),
  room("plott-yangyang", "패밀리 투룸 스파", T.twoRoom, { pricePerNight: 380000 }),
  room("plott-yangyang", "패밀리 투룸 와이드", T.twoRoom),

  // 시흥 웨이브파크: 지점 정책 "반려동물 동반 입실 불가 (*펫 동반 객실 제외)"
  room("siheung-wavepark", "스튜디오 로프트", T.loft),
  room("siheung-wavepark", "스튜디오 로프트 파셜 오션", T.loft, { pricePerNight: 200000 }),
  room("siheung-wavepark", "프리미어 스위트 패밀리", T.suiteFamily),
  // 펫 가능 객실은 이것 하나뿐이다. 이번 주말을 막아 "조건 맞는 객실 없음 → 대안 제시" 흐름을 만든다
  room("siheung-wavepark", "프리미어 스위트 패밀리 펫룸", T.suiteFamily, { pricePerNight: 280000, blocked: [{ from: "2026-10-16", to: "2026-10-19" }] }),
  room("siheung-wavepark", "패밀리 투룸", T.twoRoom),

  room("gapyeong", "포레스트 프리미어 스위트 A", T.suite),
  room("gapyeong", "포레스트 패밀리 투룸", T.twoRoom),

  room("songdo", "프리미어 스위트", T.suite),
  room("songdo", "스튜디오 W", T.studio),
  room("songdo", "패밀리 투룸", T.twoRoom),

  room("incheon-chinatown", "패밀리 투룸", T.twoRoom),
  room("incheon-chinatown", "패밀리 쓰리룸", T.threeRoom),

  room("jeju-airport", "프리미어 스위트", T.suite),
];
