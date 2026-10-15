// 인벤토리. 지점·객실·사양·사진은 공식 사이트에서 수집한 값이다 (official.json, 2026-10-13).
// 가격은 특정 날짜(2026-12-02 1박) 조회값이고, 예약 불가 기간(blocked)은 전부 가짜 값이다.
import type { Branch, RoomSpec } from "@/lib/schema";
import official from "./official.json";

export const branches: Branch[] = official.branches as Branch[];

// 가짜 재고. 평가셋의 0건 시나리오(d02·h02: 펫 객실이 이번 주말에 참)를 만들기 위한 고정값과,
// 객실마다 결정적으로 고른 주말 하나.
// ponytail: 해시 대신 객실 id(rt178 등) 숫자의 나머지 연산. PMS 연동 시 이 함수 전체가 재고 API로 바뀐다
const PET_BLOCKED = [{ from: "2026-10-16", to: "2026-10-19" }];
function fakeBlocked(id: string, name: string): { from: string; to: string }[] {
  const n = Number(id.replace(/\D/g, ""));
  const week = n % 9; // 2026-10-17(토)부터 9주 중 하나
  const sat = new Date(Date.UTC(2026, 9, 17 + week * 7));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const sun = new Date(Date.UTC(2026, 9, 18 + week * 7));
  return [...(name.includes("펫") ? PET_BLOCKED : []), ...(n % 3 === 0 ? [{ from: iso(sat), to: iso(sun) }] : [])];
}

export const roomSpecs: RoomSpec[] = (official.rooms as Omit<RoomSpec, "blocked">[]).map((r) => ({ ...r, blocked: fakeBlocked(r.id, r.name) }));
