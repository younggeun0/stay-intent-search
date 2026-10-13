import { branches, roomSpecs } from "@/data/inventory";
import { Branch, RoomSpec, type Room } from "@/lib/schema";

// 객실 이름 + 공식 시설 태그 → 속성. 전망·스파·트윈은 이름에만 있고, 욕조·베리어프리·복층·펫·커넥팅은 시설 아이콘에도 있다 (direction.md 3b).
// "파셜 오션"도 오션뷰로 본다. "파노라마"만 있으면 무엇의 전망인지 알 수 없어 오션뷰로 보지 않는다.
const FEATURE_WORDS = [
  ["욕조", "bathtub"], ["스파", "spa"], ["트윈", "twin"],
  ["베리어프리", "barrierFree"], ["배리어", "barrierFree"], ["로프트", "loft"], ["복층", "loft"], ["커넥팅", "connecting"],
] as const;

export function attrsFromName(name: string, tags: string[] = []): Pick<Room, "oceanView" | "features" | "petAllowed"> {
  const text = `${name} ${tags.join(" ")}`;
  return {
    oceanView: name.includes("오션"),
    features: [...new Set(FEATURE_WORDS.filter(([word]) => text.includes(word)).map(([, f]) => f))],
    petAllowed: text.includes("펫"),
  };
}

export const BRANCHES: Branch[] = branches.map((b) => Branch.parse(b));
export const ROOMS: Room[] = roomSpecs.map((r) => {
  const spec = RoomSpec.parse(r);
  if (!BRANCHES.some((b) => b.id === spec.branchId)) throw new Error(`알 수 없는 지점: ${spec.branchId}`);
  return { ...spec, ...attrsFromName(spec.name, spec.tags) };
});

// 공식 사이트 연결: 지점 상세 페이지와 CDN 이미지. 상세 페이지는 URL로 날짜를 받지 않는다(2026-10-13 확인)
export const placeUrl = (branchId: string) => `https://urbanstay.co.kr/place/${branchId}`;
export const imageUrl = (id: string, w = 512) => `https://cdn.ustay.life/images/${id}.jpg?w=${w}`;
export const roomImages = (r: Room): string[] => (r.images.length ? r.images : [BRANCHES.find((b) => b.id === r.branchId)!.image]);
