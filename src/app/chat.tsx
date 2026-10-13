"use client";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { interpret } from "./actions";
import { DateRange } from "./date-range";
import { imageUrl, placeUrl, roomImages } from "@/lib/inventory";
import { normalize } from "@/lib/normalize";
import { chips, datesText, guestsText, reply, stayText } from "@/lib/reply";
import { bedCount, FACILITY_LABEL, FEATURE_LABEL, search, type Hit, type SearchResult, type Stay } from "@/lib/search";
import type { SearchConditions, Turn } from "@/lib/schema";

type Msg =
  | { role: "user"; text: string; edit?: boolean }
  | { role: "assistant"; text: string; conditions: SearchConditions; result: SearchResult }
  | { role: "error"; text: string };

const EXAMPLES = ["다음주 금토 부산 바다 보이는 곳, 둘이요", "아이 둘이라 침대 따로 있는 방, 11월 말 주말 포함 2박 4명", "강아지랑 이번 주말 속초 가고 싶어요"];
const won = (n: number) => n.toLocaleString("ko-KR");

export default function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pending, start] = useTransition();
  const [detail, setDetail] = useState<Hit | null>(null);
  const [editing, setEditing] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, pending]);

  const last = msgs.findLast((m) => m.role === "assistant");

  // 상담원 발화도 대화록에 넣는다(평가셋 m 케이스와 같은 형식). 오류 메시지는 넣지 않는다
  const turnsOf = (list: Msg[]): Turn[] => list.flatMap((m) => (m.role === "error" ? [] : [{ role: m.role, text: m.text }]));
  const answer = (c: SearchConditions): Msg => {
    const result = search(c);
    return { role: "assistant", text: reply(c, result), conditions: c, result };
  };

  function send(text: string) {
    const t = text.trim();
    if (!t || pending) return;
    const next: Msg[] = [...msgs, { role: "user", text: t }];
    setMsgs(next);
    start(async () => {
      const r = await interpret(turnsOf(next));
      setMsgs([...next, r.ok ? answer(r.conditions) : { role: "error", text: r.error }]);
    });
  }

  // 화면에서 조건을 바꾸면 고객 발화로 대화에 남기고, 검색만 다시 한다(LLM 호출 없음).
  // 대화에 남겨야 다음 메시지에서 조건을 다시 추출할 때 지운 조건이 되살아나지 않는다
  function edit(say: string, c: SearchConditions) {
    if (pending) return;
    setMsgs([...msgs, { role: "user", text: say, edit: true }, answer(normalize(c))]);
  }

  const current = last?.role === "assistant" ? last : null;

  return (
    <div className="h-dvh lg:bg-surface">
    <div className="h-dvh lg:mx-auto lg:grid lg:max-w-[1280px] lg:grid-cols-[440px_1fr] lg:bg-white lg:shadow-[0_0_20px_rgb(0_0_0/5%)]">
      <section className="flex h-dvh flex-col bg-white lg:border-r lg:border-line">
        <header className="border-b border-line px-5 pb-3 pt-4">
          <p className="text-[11px] text-mute">채용 과제 프로토타입 · 어반스테이 공식 서비스가 아닙니다</p>
          <h1 className="mt-1 font-serif text-[20px]">말로 찾는 숙소 검색</h1>
        </header>
        {current && (
          <div className="border-b border-line px-5 py-3 lg:hidden">
            <Conditions c={current.conditions} onEdit={() => setEditing(true)} onChip={(say, patch) => edit(say, { ...current.conditions, ...patch })} />
          </div>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {msgs.length === 0 && (
            <div className="space-y-3">
              <p className="text-[15px] leading-relaxed">
                지역, 날짜, 인원만으로는 말하기 어려운 조건도 그대로 말씀해 주세요.
                <br />
                <span className="text-sub">예: 침대 따로, 반려동물 동반, 바다 보이는 방, 11월 말 주말</span>
              </p>
              <div className="flex flex-col items-start gap-2">
                {EXAMPLES.map((e) => (
                  <button key={e} onClick={() => send(e)} className="rounded-card bg-surface px-4 py-2.5 text-left text-[14px]">
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i}>
              {m.role === "user" ? (
                <p className={`ml-auto w-fit max-w-[85%] rounded-card px-4 py-2.5 text-[15px] ${m.edit ? "border border-line text-sub" : "bg-ink text-white"}`}>{m.text}</p>
              ) : m.role === "error" ? (
                <p className="w-fit max-w-[85%] rounded-card bg-red-50 px-4 py-2.5 text-[15px] text-red-700">{m.text}</p>
              ) : (
                <>
                  <p className="w-fit max-w-[85%] rounded-card bg-surface px-4 py-2.5 text-[15px]">{m.text}</p>
                  {/* 모바일은 최신 결과를 대화 안에, PC는 오른쪽 패널에 */}
                  {m === current && (
                    <div className="mt-3 lg:hidden">
                      <Results c={m.conditions} r={m.result} onOpen={setDetail} onRelax={edit} />
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          {pending && <p className="w-fit rounded-card bg-surface px-4 py-2.5 text-[15px] text-mute">조건을 이해하는 중…</p>}
          <div ref={end} />
        </div>

        <form
          className="flex gap-2 border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem("q") as HTMLInputElement;
            send(input.value);
            input.value = "";
          }}
        >
          <input name="q" maxLength={300} autoComplete="off" placeholder="원하는 조건을 말씀해 주세요" className="h-[50px] flex-1 rounded-card bg-surface px-4 text-[15px] outline-none placeholder:text-mute" />
          <button disabled={pending} className="h-[50px] rounded-card bg-ink px-5 text-[15px] font-medium text-white disabled:opacity-40">보내기</button>
        </form>
      </section>

      <section className="hidden h-dvh overflow-y-auto bg-surface lg:block">
        {current ? (
          <div className="space-y-5 p-8">
            <div className="rounded-card bg-white p-5">
              <Conditions c={current.conditions} onEdit={() => setEditing(true)} onChip={(say, patch) => edit(say, { ...current.conditions, ...patch })} />
            </div>
            <Results c={current.conditions} r={current.result} onOpen={setDetail} onRelax={edit} />
          </div>
        ) : (
          <p className="p-8 text-[15px] text-mute">말씀하신 조건과 맞는 객실이 여기에 표시돼요.</p>
        )}
      </section>
    </div>

      <Sheet open={!!detail} onClose={() => setDetail(null)} title={detail?.room.name ?? ""}>
        {detail && current && <Detail key={detail.room.id} hit={detail} c={current.conditions} />}
      </Sheet>
      <Sheet open={editing} onClose={() => setEditing(false)} title="날짜 선택">
        {current && editing && (
          <EditForm
            c={current.conditions}
            onSave={(say, c) => {
              setEditing(false);
              edit(say, c);
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

// 공식 사이트 검색 결과 상단의 회색 알약(지역 / 날짜 · 인원)과 같은 형태. 누르면 날짜·인원 수정
function Conditions({ c, onEdit, onChip }: { c: SearchConditions; onEdit: () => void; onChip: (say: string, patch: Partial<SearchConditions>) => void }) {
  const list = chips(c);
  return (
    <div className="space-y-2.5">
      <button onClick={onEdit} className="w-full rounded-card bg-surface px-4 py-2.5 text-left lg:bg-surface">
        <span className="block text-[15px] font-bold">{c.area ? `${c.region} ${c.area}` : (c.region ?? "전 지역")}</span>
        <span className="block text-[12px] text-sub">
          {datesText(c) ?? "날짜 미정"} · {guestsText(c) ?? "인원 미정"}
        </span>
      </button>
      {list.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {list.map((k) => (
            <button key={k.key} onClick={() => onChip(k.say, k.patch)} aria-label={`${k.label} 조건 빼기`} className="flex h-8 items-center gap-1 rounded-full border border-line bg-white px-3 text-[13px]">
              {k.label} <span className="text-mute">×</span>
            </button>
          ))}
        </div>
      )}
      {c.unhandled.length > 0 && (
        <p className="text-[12px] text-sub">
          확인하지 못한 조건: {c.unhandled.join(", ")} · 고객센터에 문의해 주세요
        </p>
      )}
    </div>
  );
}

const CARD_LIMIT = 10;

function Results({ c, r, onOpen, onRelax }: { c: SearchConditions; r: SearchResult; onOpen: (h: Hit) => void; onRelax: (say: string, c: SearchConditions) => void }) {
  const [all, setAll] = useState(false);
  if (!r.hits.length)
    return (
      <div className="space-y-3">
        {r.reasons.map((w) => (
          <p key={w} className="text-[14px] text-sub">{w}</p>
        ))}
        {r.relaxations.length > 0 && <p className="text-[14px] font-bold">이렇게 바꾸면 찾을 수 있어요</p>}
        {r.relaxations.map((o) => (
          <div key={o.labels.join()} className="rounded-card border border-line bg-white p-4">
            <p className="text-[15px] font-bold">
              {o.labels.join(" + ")} <span className="font-medium text-sub">· {o.count}실</span>
            </p>
            <ul className="mt-1.5 space-y-1 text-[13px] text-sub">
              {o.reasons.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <button onClick={() => onRelax(o.says.join(", "), o.conditions)} className="mt-3 h-10 w-full rounded-card bg-ink text-[14px] font-medium text-white">
              이렇게 다시 찾기
            </button>
          </div>
        ))}
      </div>
    );
  const shown = all ? r.hits : r.hits.slice(0, CARD_LIMIT);
  return (
    <div className="space-y-3">
      <p className="text-[14px]">
        <b>{r.hits.length}개</b>의 객실 · 가격 낮은 순
      </p>
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {shown.map((h) => (
          <Card key={h.room.id} hit={h} datesKnown={r.datesKnown} rangeSearch={!c.checkIn} onOpen={() => onOpen(h)} />
        ))}
      </div>
      {!all && r.hits.length > CARD_LIMIT && (
        <button onClick={() => setAll(true)} className="h-[50px] w-full rounded-card border border-line bg-white text-[15px]">
          {r.hits.length - CARD_LIMIT}개 더 보기
        </button>
      )}
    </div>
  );
}

function badges(h: Hit): string[] {
  return [h.room.oceanView && "오션뷰", h.room.petAllowed && "반려동물", ...h.room.features.map((f) => FEATURE_LABEL[f])].filter((x): x is string => !!x);
}

const bedsText = (h: Hit) => h.room.beds.map((b) => `${b.type} ${b.count}`).join(", ");

const STAY_LIMIT = 3;
// 카드용 짧은 일정: "11.21(토)~23(월)"
const shortStay = (a: string, b: string) => `${Number(a.slice(5, 7))}.${Number(a.slice(8))}(${dowOf(a)})~${a.slice(5, 7) === b.slice(5, 7) ? "" : `${Number(b.slice(5, 7))}.`}${Number(b.slice(8))}(${dowOf(b)})`;
const dowOf = (d: string) => "일월화수목금토"[new Date(`${d}T00:00:00Z`).getUTCDay()];

// 공식 사이트 지점 카드 형식: 사진, 이름, 위치, 구분선, 오른쪽 아래 "N박 가격원~"
function Card({ hit, datesKnown, rangeSearch, onOpen }: { hit: Hit; datesKnown: boolean; rangeSearch: boolean; onOpen: () => void }) {
  const cheapest = hit.stays.reduce<Stay | null>((a, s) => (!a || s.total < a.total ? s : a), null);
  const [main, side] = roomImages(hit.room);
  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-line bg-white">
      <button onClick={onOpen} className="flex w-full flex-1 flex-col text-left">
        {/* 사진은 공식 CDN 참조. 사이트 카드처럼 큰 사진 + 작은 사진 */}
        <div className="flex aspect-[2/1] gap-0.5 bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element -- 공식 CDN이 크기 조절(?w=)을 하므로 Next 이미지 최적화를 거치지 않는다 */}
          <img src={imageUrl(main)} alt={`${hit.room.name} 사진`} loading="lazy" className="h-full min-w-0 flex-[2] object-cover" />
          {side && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl(side, 256)} alt={`${hit.branch.name} 사진`} loading="lazy" className="h-full min-w-0 flex-1 object-cover" />
          )}
        </div>
        <div className="flex flex-1 flex-col p-4 pb-3">
          <p className="text-[15px] font-bold leading-snug">{hit.branch.name}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-sub">
            {hit.branch.region} {hit.branch.areas[0]}
          </p>
          <p className="mt-2 text-[14px] leading-snug">{hit.room.name}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-sub">
            최대 {hit.room.maxGuests}인 · {hit.room.sizeM2 ? `${hit.room.sizeM2}㎡ · ` : ""}
            {bedsText(hit)}
          </p>
          {badges(hit).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {badges(hit).map((b) => (
                <span key={b} className="inline-flex h-5 items-center rounded-full bg-surface px-2 text-[11px] leading-none">{b}</span>
              ))}
            </div>
          )}
          {rangeSearch && hit.stays.length > 0 && (
            <p className="mt-2 text-[12px] leading-snug text-sub">
              가능한 일정: {hit.stays.slice(0, STAY_LIMIT).map((s) => shortStay(s.checkIn, s.checkOut)).join(", ")}
              {hit.stays.length > STAY_LIMIT && ` 외 ${hit.stays.length - STAY_LIMIT}개`}
            </p>
          )}
          {/* 남는 높이를 채워 같은 줄 카드의 가격 줄을 맞춘다 */}
          <div className="min-h-3 flex-1" />
          <div className="flex items-baseline justify-end gap-1 border-t border-line pt-2.5">
            <span className="text-[12px]">{cheapest ? `${cheapest.nights}박` : "1박"}</span>
            <span className="text-[20px] font-bold">{won(cheapest?.total ?? hit.room.pricePerNight)}</span>
            <span className="text-[12px]">원~</span>
          </div>
          {!datesKnown && <p className="mt-1.5 text-right text-[11px] text-mute">날짜를 정하면 예약 가능 여부를 확인해요</p>}
        </div>
      </button>
      <a href={placeUrl(hit.branch.id)} target="_blank" rel="noopener noreferrer" className="flex h-10 items-center justify-center border-t border-line text-[13px] text-sub hover:bg-surface">
        공식 사이트에서 지점 보기 ↗
      </a>
    </article>
  );
}

// 상세 창: 공식 사이트 "자세히 보기" 형식(라벨-값 행). 일정을 고르면 확인 단계까지만 간다
function Detail({ hit, c }: { hit: Hit; c: SearchConditions }) {
  const [pick, setPick] = useState<Stay | null>(hit.stays.length === 1 ? hit.stays[0] : null);
  const [confirm, setConfirm] = useState(false);
  const r = hit.room;
  const rows: [string, string][] = [
    ["지점", hit.branch.name],
    ["인원", `기준 ${r.baseGuests}인 / 최대 ${r.maxGuests}인`],
    ["크기", r.sizeM2 ? `${r.sizeM2}㎡` : "-"],
    ["침실", `${r.bedrooms}룸`],
    ["침대", `${bedsText(hit)} (침대 ${bedCount(r)}개로 셈)`],
    ["욕실", `${r.bathrooms}개`],
    ["시설", r.facilities.map((f) => FACILITY_LABEL[f]).join(", ")],
  ];
  if (confirm && pick)
    return (
      <div className="space-y-4">
        <dl className="divide-y divide-line text-[14px]">
          {(
            [
              ["지점", hit.branch.name],
              ["객실", r.name],
              ["일정", `${stayText(pick.checkIn, pick.checkOut)} · ${pick.nights}박`],
              ["인원", guestsText(c) ?? "-"],
              ["금액", `${won(pick.total)}원`],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="flex gap-4 py-2.5">
              <dt className="w-12 shrink-0 text-sub">{k}</dt>
              <dd className={k === "금액" ? "font-bold" : ""}>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="rounded-card bg-surface p-4 text-[13px] text-sub">
          프로토타입은 여기까지예요. 결제와 예약 확정은 과제 범위에서 제외했고, 가격과 재고는 가짜 데이터예요.
        </p>
        <button onClick={() => setConfirm(false)} className="h-[50px] w-full rounded-card border border-line text-[15px]">
          다시 고르기
        </button>
      </div>
    );
  return (
    <div className="space-y-5">
      <div className="-mx-5 -mt-4 flex snap-x gap-0.5 overflow-x-auto">
        {roomImages(r).map((id) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={id} src={imageUrl(id, 768)} alt={`${r.name} 사진`} className="aspect-[3/2] w-full shrink-0 snap-start object-cover" />
        ))}
      </div>
      <dl className="text-[14px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-4 py-1.5">
            <dt className="w-12 shrink-0 text-sub">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {r.specSource !== "observed" && (
        <p className="text-[12px] text-mute">{r.specSource === "capacity" ? "인원만 공식 사이트에서 확인했고, 나머지 사양은 객실 유형으로 추정했어요." : "사양은 객실 유형으로 추정했어요."}</p>
      )}
      {hit.stays.length > 0 ? (
        <div>
          <p className="mb-2 text-[14px] font-bold">예약 가능한 일정</p>
          <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
            {hit.stays.map((s) => (
              <button
                key={s.checkIn}
                onClick={() => setPick(s)}
                className={`rounded-full border px-3 py-1.5 text-[13px] ${pick === s ? "border-ink bg-ink text-white" : "border-line"}`}
              >
                {stayText(s.checkIn, s.checkOut)} · {won(s.total)}원
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[14px] text-sub">날짜를 정하면 예약 가능한 일정을 보여드려요. 1박 {won(r.pricePerNight)}원부터예요.</p>
      )}
      <a href={placeUrl(hit.branch.id)} target="_blank" rel="noopener noreferrer" className="flex h-[50px] w-full items-center justify-center rounded-card border border-line text-[15px]">
        공식 사이트 상세 페이지 ↗
      </a>
      <p className="-mt-3 text-center text-[11px] text-mute">공식 사이트에서는 날짜를 다시 골라야 해요. 실제 가격과 재고는 다를 수 있어요.</p>
      <button disabled={!pick} onClick={() => setConfirm(true)} className="h-[50px] w-full rounded-card bg-ink text-[15px] font-medium text-white disabled:opacity-30">
        {pick ? "이 일정으로 예약 확인" : "일정을 골라 주세요"}
      </button>
    </div>
  );
}

function EditForm({ c, onSave }: { c: SearchConditions; onSave: (say: string, c: SearchConditions) => void }) {
  const [checkIn, setCheckIn] = useState(c.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(c.checkOut ?? "");
  const [guests, setGuests] = useState(c.guests ?? 2);
  const valid = !!checkIn && !!checkOut;
  const step = "flex size-8 items-center justify-center rounded-full border border-line text-[16px] disabled:text-line";
  return (
    <div className="space-y-4">
      {c.dateRange && <p className="text-[13px] text-sub">지금은 {datesText(c)} 조건으로 찾고 있어요. 날짜를 정하면 그 일정만 찾아요.</p>}
      <DateRange checkIn={checkIn} checkOut={checkOut} focus={c.dateRange?.from} onChange={(a, b) => { setCheckIn(a); setCheckOut(b); }} />
      {/* 공식 사이트 홈 검색의 인원 행과 같은 형태 */}
      <div className="flex items-center border-t border-line pt-4">
        <span className="text-[15px] font-bold">인원</span>
        <span className="ml-2 text-[12px] text-mute">36개월 이하 영유아 제외</span>
        <div className="ml-auto flex items-center gap-3">
          <button type="button" aria-label="인원 줄이기" disabled={guests <= 1} onClick={() => setGuests(guests - 1)} className={step}>−</button>
          <span className="w-8 text-center text-[15px] font-bold">{guests}명</span>
          <button type="button" aria-label="인원 늘리기" disabled={guests >= 20} onClick={() => setGuests(guests + 1)} className={step}>+</button>
        </div>
      </div>
      <button
        disabled={!valid}
        onClick={() => onSave(`${stayText(checkIn, checkOut)}, ${guests}명으로 바꿀게요`, { ...c, checkIn, checkOut, dateRange: null, nights: null, weekend: null, guests })}
        className="h-[50px] w-full rounded-card bg-ink text-[15px] font-medium text-white disabled:bg-line disabled:text-mute"
      >
        완료
      </button>
    </div>
  );
}

// 네이티브 <dialog> 하나로 모바일은 하단 시트, PC(lg)는 가운데 모달
function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (open && !d?.open) d?.showModal();
    if (!open && d?.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 mt-auto max-h-[85dvh] w-full max-w-full rounded-t-sheet bg-white p-0 backdrop:bg-black/50 lg:m-auto lg:max-w-[460px] lg:rounded-card"
    >
      <div className="sticky top-0 flex items-center justify-between border-b border-line bg-white px-5 py-4">
        <h2 className="text-[17px] font-bold">{title}</h2>
        <button onClick={onClose} aria-label="닫기" className="flex size-8 items-center justify-center rounded-full bg-surface text-[14px]">
          ×
        </button>
      </div>
      <div className="px-5 py-4 pb-8">{children}</div>
    </dialog>
  );
}
