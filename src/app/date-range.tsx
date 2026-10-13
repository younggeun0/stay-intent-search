"use client";
// 공식 사이트 "날짜 선택" 시트와 같은 동작 (2026-10-13 확인):
// 달은 세로로 이어지고, 첫 탭은 체크인(체크아웃 비움), 두 번째 탭은 체크아웃. 체크인보다 앞이거나 같은 날을 누르면 체크인을 다시 정한다.
// 일요일 빨강, 토요일 파랑, 지난 날 회색, 오늘은 빨간 점. 선택일은 검정 원 + "체크인/체크아웃", 사이는 회색 띠.
import { useEffect, useRef } from "react";

const DAY_MS = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: string, n: number) => iso(new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY_MS));
const nightsBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / DAY_MS;
const dot = (d: string) => `${d.slice(5, 7)}.${d.slice(8)}`;
export const todayKst = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());

function months(today: string, count: number): { key: string; label: string; cells: (string | null)[] }[] {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const first = new Date(Date.UTC(y, m - 1 + i, 1));
    const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    const cells: (string | null)[] = Array(first.getUTCDay()).fill(null);
    for (let d = 0; d < days; d++) cells.push(addDays(iso(first), d));
    return { key: iso(first), label: `${first.getUTCFullYear()}년 ${first.getUTCMonth() + 1}월`, cells };
  });
}

// focus: 처음 보여줄 날짜(지금 찾고 있는 기간의 시작). 그 달로 스크롤한다
export function DateRange({ checkIn, checkOut, focus, onChange }: { checkIn: string; checkOut: string; focus?: string; onChange: (checkIn: string, checkOut: string) => void }) {
  const today = todayKst();
  const list = useRef<HTMLDivElement>(null);
  const focusMonth = (checkIn || focus || today).slice(0, 7);
  useEffect(() => {
    const el = list.current?.querySelector<HTMLElement>(`[data-month="${focusMonth}"]`);
    // scrollIntoView는 바깥 시트까지 스크롤하므로 달력 목록만 움직인다
    if (el && list.current) list.current.scrollTop = el.offsetTop - list.current.offsetTop;
  }, [focusMonth]);
  const pick = (d: string) => {
    if (!checkIn || checkOut || d <= checkIn) onChange(d, "");
    else onChange(checkIn, d);
  };
  return (
    <div>
      <div className="flex items-center gap-2 text-[16px] font-bold">
        <span>{checkIn ? dot(checkIn) : "체크인"}</span>
        <span className="text-mute">→</span>
        <span className={checkOut ? "" : "font-medium text-mute"}>{checkOut ? dot(checkOut) : "체크아웃"}</span>
        {checkIn && checkOut && <span className="ml-auto rounded-full bg-blue-50 px-2.5 py-0.5 text-[12px] font-bold text-blue-700">{nightsBetween(checkIn, checkOut)}박</span>}
      </div>
      <div ref={list} className="mt-4 max-h-[46dvh] space-y-6 overflow-y-auto">
        {months(today, 6).map((mo) => (
          <section key={mo.key} data-month={mo.key.slice(0, 7)}>
            <h3 className="mb-2 text-center text-[15px] font-bold">{mo.label}</h3>
            <div className="grid grid-cols-7 text-center text-[13px]">
              {"일월화수목금토".split("").map((w, i) => (
                <span key={w} className={`py-1 ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-600" : "text-sub"}`}>{w}</span>
              ))}
              {mo.cells.map((d, i) => {
                if (!d) return <span key={`e${i}`} />;
                const past = d < today;
                const isIn = d === checkIn;
                const isOut = d === checkOut;
                const inBand = checkIn && checkOut && d > checkIn && d < checkOut;
                const dow = i % 7;
                const color = past ? "text-line" : isIn || isOut ? "text-white" : dow === 0 ? "text-red-500" : dow === 6 ? "text-blue-600" : "";
                // 띠: 체크인 칸은 오른쪽 절반, 체크아웃 칸은 왼쪽 절반만 칠해 원과 이어 보이게 한다
                const band = inBand ? "bg-surface" : isIn && checkOut ? "bg-[linear-gradient(to_right,transparent_50%,var(--color-surface)_50%)]" : isOut ? "bg-[linear-gradient(to_left,transparent_50%,var(--color-surface)_50%)]" : "";
                return (
                  <button key={d} type="button" disabled={past} onClick={() => pick(d)} className="flex h-14 flex-col items-center pt-1 disabled:cursor-default">
                    <span className={`flex h-9 w-full items-center justify-center ${band}`}>
                      <span className={`relative flex size-9 items-center justify-center rounded-full text-[15px] ${isIn || isOut ? "bg-ink font-bold" : ""} ${color} ${d === today ? "font-bold" : ""}`}>
                        {d === today && !isIn && <span className="absolute -top-0.5 size-1 rounded-full bg-red-500" />}
                        {Number(d.slice(8))}
                      </span>
                    </span>
                    <span className="text-[10px] leading-4">{isIn ? "체크인" : isOut ? "체크아웃" : ""}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
