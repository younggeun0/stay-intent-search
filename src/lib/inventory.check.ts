import assert from "node:assert/strict";
import { attrsFromName, BRANCHES, ROOMS } from "./inventory";

assert.deepEqual(attrsFromName("프리미어 스위트 로프트 스파"), { oceanView: false, features: ["spa", "loft"], petAllowed: false });
assert.deepEqual(attrsFromName("스튜디오 로프트 파셜 오션"), { oceanView: true, features: ["loft"], petAllowed: false });
assert.equal(attrsFromName("패밀리 쓰리룸 G 파노라마").oceanView, false);
assert.equal(attrsFromName("프리미어 스위트 패밀리 펫룸").petAllowed, true);
assert.deepEqual(attrsFromName("프리미어 스위트 (욕조)").features, ["bathtub"]);

const n = (f: (r: (typeof ROOMS)[number]) => boolean) => ROOMS.filter(f).length;
console.log(`지점 ${BRANCHES.length} / 객실 ${ROOMS.length}`);
console.log(`사양 출처: observed ${n((r) => r.specSource === "observed")}, capacity ${n((r) => r.specSource === "capacity")}, estimated ${n((r) => r.specSource === "estimated")}`);
console.log(`오션뷰 ${n((r) => r.oceanView)}, 펫 ${n((r) => r.petAllowed)}, 예약 불가 기간 있음 ${n((r) => r.blocked.length > 0)}`);
for (const f of ["bathtub", "spa", "twin", "barrierFree", "loft", "connecting"] as const) {
  console.log(`  ${f}: ${ROOMS.filter((r) => r.features.includes(f)).map((r) => r.name).join(", ")}`);
}
console.log("인벤토리 검증 통과");
