import { branches, roomSpecs } from "@/data/inventory";
import { BRANCH_SITE, ROOM_IMAGE } from "@/data/site";
import { Branch, RoomSpec, type Room } from "@/lib/schema";

// 객실 이름 → 속성. 사이트에서 전망·펫·욕조 등은 이름에만 있다 (direction.md 3b).
// "파셜 오션"도 오션뷰로 본다. "파노라마"만 있으면 무엇의 전망인지 알 수 없어 오션뷰로 보지 않는다.
const FEATURE_WORDS = [
  ["욕조", "bathtub"], ["스파", "spa"], ["트윈", "twin"],
  ["베리어프리", "barrierFree"], ["로프트", "loft"], ["커넥팅", "connecting"],
] as const;

export function attrsFromName(name: string): Pick<Room, "oceanView" | "features" | "petAllowed"> {
  return {
    oceanView: name.includes("오션"),
    features: FEATURE_WORDS.filter(([word]) => name.includes(word)).map(([, f]) => f),
    petAllowed: name.includes("펫"),
  };
}

export const BRANCHES: Branch[] = branches.map((b) => Branch.parse(b));
export const ROOMS: Room[] = roomSpecs.map((r) => {
  const spec = RoomSpec.parse(r);
  if (!BRANCHES.some((b) => b.id === spec.branchId)) throw new Error(`알 수 없는 지점: ${spec.branchId}`);
  return { ...spec, ...attrsFromName(spec.name) };
});

// 공식 사이트 연결: 지점 상세 페이지와 CDN 이미지 (src/data/site.ts). 상세 페이지는 URL로 날짜를 받지 않는다(2026-10-13 확인)
export const placeUrl = (branchId: string) => `https://urbanstay.co.kr/place/${BRANCH_SITE[branchId].slug}`;
export const imageUrl = (id: string, w = 512) => `https://cdn.ustay.life/images/${id}.jpg?w=${w}`;
export const roomImages = (r: Room): string[] => [ROOM_IMAGE[r.id], BRANCH_SITE[r.branchId].image].filter((x): x is string => !!x);
