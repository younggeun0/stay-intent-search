import { branches, roomSpecs } from "@/data/inventory";
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
