import assert from "node:assert/strict";
import { BRANCH_HELP, helpArticleFor, helpSearchFor } from "@/data/help";
import { attrsFromName, BRANCHES, placeUrl, roomImages, ROOMS } from "./inventory";

assert.deepEqual(attrsFromName("프리미어 스위트 로프트 스파"), { oceanView: false, features: ["spa", "loft"], petAllowed: false });
assert.deepEqual(attrsFromName("스튜디오 로프트 파셜 오션"), { oceanView: true, features: ["loft"], petAllowed: false });
assert.equal(attrsFromName("패밀리 쓰리룸 G 파노라마").oceanView, false);
assert.equal(attrsFromName("프리미어 스위트 패밀리 펫룸").petAllowed, true);
assert.deepEqual(attrsFromName("프리미어 스위트 (욕조)").features, ["bathtub"]);
assert.deepEqual(attrsFromName("스탠다드", ["욕조", "베리어프리"]).features, ["bathtub", "barrierFree"]);
assert.equal(attrsFromName("스튜디오 로프트", ["복층"]).features.length, 1);

const n = (f: (r: (typeof ROOMS)[number]) => boolean) => ROOMS.filter(f).length;
console.log(`지점 ${BRANCHES.length} / 객실 ${ROOMS.length}`);
console.log(`사양 출처: observed ${n((r) => r.specSource === "observed")}, capacity ${n((r) => r.specSource === "capacity")}`);
console.log(`지역별 지점: ${BRANCHES.map((b) => b.region).reduce<Record<string, number>>((m, r) => ({ ...m, [r]: (m[r] ?? 0) + 1 }), {}) && Object.entries(BRANCHES.reduce<Record<string, number>>((m, b) => ({ ...m, [b.region]: (m[b.region] ?? 0) + 1 }), {})).map(([k, v]) => `${k} ${v}`).join(", ")}`);
console.log(`오션뷰 ${n((r) => r.oceanView)}, 펫 ${n((r) => r.petAllowed)}, 예약 불가 기간 있음 ${n((r) => r.blocked.length > 0)}`);
for (const f of ["bathtub", "spa", "twin", "barrierFree", "loft", "connecting"] as const) {
  console.log(`  ${f}: ${ROOMS.filter((r) => r.features.includes(f)).map((r) => r.name).join(", ")}`);
}
console.log("인벤토리 검증 통과");
// 모든 지점에 객실이 있고, 객실마다 사진이 있다
for (const b of BRANCHES) assert.ok(placeUrl(b.id).endsWith("/place/") === false && ROOMS.some((r) => r.branchId === b.id), b.id);
for (const r of ROOMS) assert.ok(roomImages(r).length > 0, r.id);
// 헬프 센터: 모든 지점에 카테고리가 있고, 확인한 키워드만 검색 링크가 된다
for (const b of BRANCHES) assert.ok(BRANCH_HELP[b.id]?.startsWith("/ko/categories/"), `헬프 카테고리 없음: ${b.id}`);
assert.ok(helpSearchFor("주차 무료") && helpSearchFor("아기 욕조") && !helpSearchFor("조용한 곳") && !helpSearchFor("바다 근처"));
assert.equal(helpArticleFor("'반려동물 동반' 객실 2실은 그 날짜에 예약이 찼어요.")?.label, "반려동물 정책");
assert.equal(helpArticleFor("30명 숙박 가능 조건에 맞는 객실이 없어요.")?.label, "인원 추가 안내");

