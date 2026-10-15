"use client";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { interpret } from "./actions";
import { DateRange } from "./date-range";
import { branchHelpUrl, helpArticleFor, helpSearchFor } from "@/data/help";
import { ROOMS, imageUrl, placeUrl, roomImages } from "@/lib/inventory";
import { normalize } from "@/lib/normalize";
import { chips, datesText, dow, guestsText, reply, stayText } from "@/lib/reply";
import { bedCount, FACILITY_LABEL, FEATURE_LABEL, josa, search, type Hit, type SearchResult, type Stay } from "@/lib/search";
import type { SearchConditions, Turn } from "@/lib/schema";

type Msg =
  | { role: "user"; text: string; edit?: boolean }
  | { role: "assistant"; text: string; conditions: SearchConditions; result: SearchResult }
  | { role: "error"; text: string };

const EXAMPLES = ["다음주 금토 부산 바다 보이는 곳, 둘이요", "아이 둘이라 침대 따로 있는 방, 11월 말 주말 포함 2박 4명", "강아지랑 같이 묵을 수 있는 곳"];
// 인원 선택 상한: 전 객실 중 최대 인원(지금은 10명). 이보다 많으면 어떤 방도 맞지 않는다
const MAX_GUESTS = Math.max(...ROOMS.map((r) => r.maxGuests));
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

  function reset() {
    setMsgs([]);
    setDetail(null);
    setEditing(false);
  }

  const current = last?.role === "assistant" ? last : null;
  const started = msgs.length > 0;

  // 첫 화면 입력창은 항상 자동 포커스. 대화가 시작되면 입력창이 대화 화면 아래에 새로 그려지는데,
  // 터치 기기에서 여기에 포커스를 주면 샘플 버튼만 눌러도 가상 키보드가 열리므로 마우스 기기에서만 준다
  const form = (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const input = e.currentTarget.elements.namedItem("q") as HTMLInputElement;
        send(input.value);
        input.value = "";
      }}
    >
      <input name="q" maxLength={300} autoComplete="off" autoFocus={!started || matchMedia("(pointer: fine)").matches} placeholder="조건을 말씀해 주세요" className="min-h-[3.125rem] min-w-0 flex-[1_1_12rem] rounded-card bg-surface px-4 text-base outline-none placeholder:text-mute" />
      <button disabled={pending} className="ml-auto min-h-[3.125rem] shrink-0 rounded-card bg-ink px-5 text-body font-medium text-white disabled:opacity-40">보내기</button>
    </form>
  );

  return (
    <div className="h-dvh bg-surface">
    {/* 한 컬럼일 때도 최대 폭을 둔다: 글꼴을 키운 PC는 lg 기준(rem)에 못 미쳐 한 컬럼이 된다 */}
    <div className={`mx-auto h-dvh max-w-[40rem] bg-white shadow-[0_0_20px_rgb(0_0_0/5%)] ${started ? "lg:grid lg:max-w-[1280px] lg:grid-cols-[440px_1fr]" : ""}`}>
      <section className={`flex h-dvh flex-col bg-white ${started ? "lg:border-r lg:border-line" : ""}`}>
        {!started ? (
          // 첫 화면: 안내와 입력창을 뷰포트 가운데에
          <div className="flex flex-1 flex-col justify-center gap-6 px-5 py-8">
            <Brand />
            <p className="text-body leading-relaxed">지역, 날짜, 인원만으로는 말하기 어려운 조건도 그대로 말씀해 주세요.</p>
            {form}
            <div className="flex flex-col items-start gap-2">
              {EXAMPLES.map((e) => (
                <button key={e} onClick={() => send(e)} className="rounded-full border border-line px-4 py-2 text-left text-sm text-sub">
                  {e}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* 입력창만 고정하고 나머지는 함께 스크롤한다. 글꼴을 크게 설정한 기기에서 고정 영역이 화면을 다 차지하지 않게 */}
            <div className="flex-1 overflow-y-auto">
              <header className="flex items-center gap-3 border-b border-line px-5 pb-3 pt-4">
                <Brand />
                <button onClick={reset} aria-label="새 대화 시작" title="새 대화" className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-sub">
                  <Icon name="refresh" />
                </button>
              </header>
              <div className="space-y-3 px-5 py-4">
                {msgs.map((m, i) => (
                  <div key={i}>
                    {m.role === "user" ? (
                      <p className={`ml-auto w-fit max-w-[85%] rounded-card px-4 py-2.5 text-body ${m.edit ? "border border-line text-sub" : "bg-ink text-white"}`}>{m.text}</p>
                    ) : m.role === "error" ? (
                      <p className="w-fit max-w-[85%] rounded-card bg-red-50 px-4 py-2.5 text-body text-red-700">{m.text}</p>
                    ) : (
                      <>
                        <p className="w-fit max-w-[85%] rounded-card bg-surface px-4 py-2.5 text-body">{m.text}</p>
                        {/* 모바일은 최신 결과를 대화 안에, PC는 오른쪽 패널에 */}
                        {m === current && (
                          <div className="mt-3 space-y-3 lg:hidden">
                            <div className="rounded-card border border-line p-3">
                              <Conditions c={m.conditions} onEdit={() => setEditing(true)} onChip={(say, patch) => edit(say, { ...m.conditions, ...patch })} />
                            </div>
                            <Results c={m.conditions} r={m.result} onOpen={setDetail} onRelax={edit} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
                {pending && <Thinking />}
                <div ref={end} />
              </div>
            </div>
            <div className="border-t border-line p-3">{form}</div>
          </>
        )}
      </section>

      {started && (
        <section className="hidden h-dvh overflow-y-auto bg-surface animate-fade-up lg:block">
          {current ? (
            <div className="space-y-5 p-8">
              {pending && <Thinking />}
              <div className={`space-y-5 transition-opacity ${pending ? "opacity-50" : ""}`}>
                <div className="rounded-card bg-white p-5">
                  <Conditions c={current.conditions} onEdit={() => setEditing(true)} onChip={(say, patch) => edit(say, { ...current.conditions, ...patch })} />
                </div>
                <Results key={msgs.length} c={current.conditions} r={current.result} onOpen={setDetail} onRelax={edit} />
              </div>
            </div>
          ) : (
            <div className="p-8">{pending ? <Thinking /> : <p className="text-body text-mute">조건에 맞는 객실이 여기에 표시돼요.</p>}</div>
          )}
        </section>
      )}
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

// 브랜드 심볼은 공식 CDN(앱 아이콘)을 참조한다. 로고 파일은 레포에 두지 않는다 (DESIGN.md)
function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="https://cdn.ustay.life/icon-192x192.png" alt="어반스테이" width={40} height={40} className="size-10 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-mute">채용 과제 프로토타입 · 어반스테이 공식 서비스가 아닙니다</p>
        <h1 className="mt-0.5 text-xl font-semibold">숙소 찾기</h1>
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <p className="flex w-fit items-center gap-2 rounded-card bg-surface px-4 py-2.5 text-body text-mute" role="status">
      <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-line border-t-ink" />
      조건을 이해하는 중…
    </p>
  );
}

// 공식 사이트 아이콘과 같은 형태: 24 viewBox, stroke 1.8, currentColor
const PATHS = {
  x: "M18 6 6 18M6 6l12 12",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  arrowUpRight: "M7 17 17 7M7 7h10v10",
  refresh: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5",
} as const;
function Icon({ name, size = 16 }: { name: keyof typeof PATHS; size?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  );
}

// 헬프 센터 링크. 새 탭, 밑줄, 작은 화살표
function HelpLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline decoration-line underline-offset-2 hover:text-ink">
      {children}
      <Icon name="arrowUpRight" size={11} />
    </a>
  );
}
// 0건 이유 문장에 맞는 정책 아티클(반려동물, 인원)이 있으면 뒤에 붙인다
function HelpArticle({ text }: { text: string }) {
  const a = helpArticleFor(text);
  return a ? <HelpLink href={a.url}>{a.label}</HelpLink> : null;
}

// 공식 사이트 검색 결과 상단의 회색 알약(지역 / 날짜 · 인원)과 같은 형태. 누르면 날짜·인원 수정
function Conditions({ c, onEdit, onChip }: { c: SearchConditions; onEdit: () => void; onChip: (say: string, patch: Partial<SearchConditions>) => void }) {
  const list = chips(c);
  return (
    <div className="space-y-2.5">
      <button onClick={onEdit} className="w-full rounded-card bg-surface px-4 py-2.5 text-left">
        <span className="block text-body font-bold">{c.area ? `${c.region} ${c.area}` : (c.region ?? "전 지역")}</span>
        <span className="block text-xs text-sub">
          {datesText(c) ?? "날짜 미정"} · {guestsText(c) ?? "인원 미정"}
        </span>
      </button>
      {list.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {/* × 를 원 안에 넣어 "누르면 빠진다"가 보이게 한다 */}
          {list.map((k) => (
            <button key={k.key} onClick={() => onChip(k.say, k.patch)} aria-label={`${k.label} 조건 빼기`} className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-white py-1.5 pl-4 pr-2 text-body">
              {k.label}
              <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-sub">
                <Icon name="x" size={14} />
              </span>
            </button>
          ))}
        </div>
      )}
      {c.unhandled.length > 0 && (
        <p className="text-xs text-sub">
          확인하지 못한 조건:{" "}
          {c.unhandled.map((u, i) => {
            const url = helpSearchFor(u);
            return (
              <span key={u}>
                {i > 0 && ", "}
                {/* 헬프 센터에 아티클이 있다고 확인한 조건(주차, 조식, 수영장 등)만 검색 링크로 연결한다 (src/data/help.ts) */}
                {url ? <HelpLink href={url}>{u}</HelpLink> : u}
              </span>
            );
          })}
          {" "}· 고객센터에 문의해 주세요
        </p>
      )}
    </div>
  );
}

const CARD_LIMIT = 12;

function Results({ c, r, onOpen, onRelax }: { c: SearchConditions; r: SearchResult; onOpen: (h: Hit) => void; onRelax: (say: string, c: SearchConditions) => void }) {
  const [all, setAll] = useState(false);
  if (!r.hits.length)
    return (
      <div className="space-y-3">
        {r.reasons.map((w) => (
          <p key={w} className="text-sm text-sub">
            {w} <HelpArticle text={w} />
          </p>
        ))}
        {r.relaxations.length > 0 && <p className="text-sm font-bold">이렇게 바꾸면 찾을 수 있어요</p>}
        {/* 카드: 제목 = 바꿀 조건, 본문 = 왜 막혔는지, 버튼 = 제목을 그대로 반복해 "이렇게"가 무엇인지 분명히 한다 */}
        <div className="grid gap-3 lg:grid-cols-2">
          {r.relaxations.map((o) => {
            const title = o.labels.join(" + ");
            return (
              <div key={o.labels.join()} className="flex flex-col rounded-card border border-line bg-white p-4">
                <p className="text-body font-bold">
                  {title} <span className="font-medium text-sub">· {o.count}실</span>
                </p>
                <ul className="mt-1.5 flex-1 space-y-1 text-label text-sub">
                  {o.reasons.map((w) => (
                    <li key={w}>
                      {w} <HelpArticle text={w} />
                    </li>
                  ))}
                </ul>
                {/* 공식 "예약하기" 버튼 형태(알약, semibold). 글자는 공식 12px보다 큰 13px (DESIGN.md) */}
                <button onClick={() => onRelax(o.says.join(", "), o.conditions)} className="mt-3 min-h-10 w-fit self-end rounded-full bg-ink px-4 text-label font-semibold text-white">
                  {josa(title, "으로", "로")} 다시 찾기
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  const shown = all ? r.hits : r.hits.slice(0, CARD_LIMIT);
  return (
    <div className="space-y-3">
      <p className="text-sm">
        <b>{r.hits.length}개</b>의 객실 · 가격 낮은 순
      </p>
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {shown.map((h) => (
          <Card key={h.room.id} hit={h} datesKnown={r.datesKnown} rangeSearch={!c.checkIn} onOpen={() => onOpen(h)} />
        ))}
      </div>
      {!all && r.hits.length > CARD_LIMIT && (
        <button onClick={() => setAll(true)} className="min-h-[3.125rem] w-full rounded-card border border-line bg-white text-body">
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
const shortStay = (a: string, b: string) => `${Number(a.slice(5, 7))}.${Number(a.slice(8))}(${dow(a)})~${a.slice(5, 7) === b.slice(5, 7) ? "" : `${Number(b.slice(5, 7))}.`}${Number(b.slice(8))}(${dow(b)})`;

// 공식 지점 페이지의 객실 카드 형식: 사진 한 장(430:303), 이름, 사양, 오른쪽 아래 "N박 가격원~"
function Card({ hit, datesKnown, rangeSearch, onOpen }: { hit: Hit; datesKnown: boolean; rangeSearch: boolean; onOpen: () => void }) {
  const cheapest = hit.stays.reduce<Stay | null>((a, s) => (!a || s.total < a.total ? s : a), null);
  const [main] = roomImages(hit.room);
  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-line bg-white">
      <button onClick={onOpen} className="flex w-full flex-1 flex-col text-left">
        {/* eslint-disable-next-line @next/next/no-img-element -- 공식 CDN이 크기 조절(?w=)을 하므로 Next 이미지 최적화를 거치지 않는다 */}
        <img src={imageUrl(main, 640)} alt={`${hit.room.name} 사진`} loading="lazy" className="aspect-[430/303] w-full bg-surface object-cover" />
        <div className="flex flex-1 flex-col p-4 pb-3">
          <p className="text-body font-bold leading-snug">{hit.branch.name}</p>
          <p className="mt-0.5 text-xs leading-snug text-sub">
            {hit.branch.region} {hit.branch.areas[0]}
          </p>
          <p className="mt-2 text-sm leading-snug">{hit.room.name}</p>
          <p className="mt-0.5 text-xs leading-snug text-sub">
            최대 {hit.room.maxGuests}인 · {hit.room.sizeM2 ? `${hit.room.sizeM2}㎡ · ` : ""}
            {bedsText(hit)}
          </p>
          {badges(hit).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {badges(hit).map((b) => (
                <span key={b} className="inline-flex min-h-5 items-center rounded-full bg-surface px-2 py-0.5 text-xs leading-none">{b}</span>
              ))}
            </div>
          )}
          {rangeSearch && hit.stays.length > 0 && (
            <p className="mt-2 text-xs leading-snug text-sub">
              가능한 일정: {hit.stays.slice(0, STAY_LIMIT).map((s) => shortStay(s.checkIn, s.checkOut)).join(", ")}
              {hit.stays.length > STAY_LIMIT && ` 외 ${hit.stays.length - STAY_LIMIT}개`}
            </p>
          )}
          {/* 남는 높이를 채워 같은 줄 카드의 가격 줄을 맞춘다 */}
          <div className="min-h-3 flex-1" />
          <div className="flex flex-wrap items-baseline justify-end gap-x-1 whitespace-nowrap border-t border-line pt-2.5">
            <span className="text-xs">{cheapest ? `${cheapest.nights}박` : "1박"}</span>
            <span>
              <span className="text-xl font-bold">{won(cheapest?.total ?? hit.room.pricePerNight)}</span>
              <span className="ml-0.5 text-xs">원~</span>
            </span>
          </div>
          {!datesKnown && <p className="mt-1.5 text-right text-xs text-mute">날짜를 정하면 예약 가능 여부를 확인해요</p>}
        </div>
      </button>
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
    ["시설", r.facilities.map((f) => FACILITY_LABEL[f]).join(", ") || "-"],
  ];
  const dates = pick ?? (c.checkIn && c.checkOut ? { checkIn: c.checkIn, checkOut: c.checkOut } : null);
  const again = dates ? [stayText(dates.checkIn, dates.checkOut), guestsText(c)].filter(Boolean).join(" · ") : "";
  if (confirm && pick)
    return (
      <>
      <Body>
      <div className="space-y-4">
        <dl className="divide-y divide-line text-sm">
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
        <p className="rounded-card bg-surface p-4 text-label text-sub">
          프로토타입은 여기까지예요. 결제와 예약 확정은 과제 범위에서 제외했고, 재고는 가짜 데이터예요. 가격은 공식 사이트에서 하루치를 조회한 값이라 실제와 다를 수 있어요.
        </p>
      </div>
      </Body>
      <Footer>
        <button onClick={() => setConfirm(false)} className="min-h-[3.125rem] w-full rounded-card border border-line text-body">
          다시 고르기
        </button>
      </Footer>
      </>
    );
  return (
    <>
    <Body>
    <div className="space-y-5">
      <Gallery ids={roomImages(r)} alt={`${r.name} 사진`} />
      <dl className="text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-4 py-1.5">
            <dt className="w-12 shrink-0 text-sub">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {r.specSource !== "observed" && <p className="text-xs text-mute">인원과 구조는 공식 사이트에서 확인했고, 시설은 같은 지점의 다른 객실로 추정했어요.</p>}
      {hit.stays.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-bold">예약 가능한 일정</p>
          <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
            {hit.stays.map((s) => (
              <button
                key={s.checkIn}
                onClick={() => setPick(s)}
                className={`rounded-full border px-3 py-1.5 text-label ${pick === s ? "border-ink bg-ink text-white" : "border-line"}`}
              >
                {stayText(s.checkIn, s.checkOut)} · {won(s.total)}원
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-sub">날짜를 정하면 예약 가능한 일정을 보여드려요. 1박 {won(r.pricePerNight)}원부터예요.</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <a href={placeUrl(hit.branch.id)} target="_blank" rel="noopener noreferrer" className="flex min-h-[3.125rem] items-center justify-center gap-1 rounded-card border border-line text-center text-body">
          공식 사이트 상세 <Icon name="arrowUpRight" size={14} />
        </a>
        {/* 헬프 센터의 지점 카테고리: 주차, 조식, 부대시설, 짐 보관처럼 검색 조건이 아닌 궁금증을 그 자리에서 푼다 */}
        <a href={branchHelpUrl(hit.branch.id)} target="_blank" rel="noopener noreferrer" className="flex min-h-[3.125rem] items-center justify-center gap-1 rounded-card border border-line text-center text-body">
          지점 이용 안내 <Icon name="arrowUpRight" size={14} />
        </a>
      </div>
      {/* 공식 사이트는 URL의 checkIn·checkOut·guestCount를 읽지 않는다(새로 열면 오늘·1명). 링크로 일정을 넘길 수 없어 다시 고를 값을 적어 준다 */}
      <p className="-mt-3 text-center text-xs text-mute">
        {again ? `공식 사이트에서 다시 고를 일정: ${again}.` : "공식 사이트에서는 날짜를 다시 골라야 해요."} 실제 가격과 재고는 다를 수 있어요.
      </p>
    </div>
    </Body>
    <Footer>
      <button disabled={!pick} onClick={() => setConfirm(true)} className="min-h-[3.125rem] w-full rounded-card bg-ink text-body font-medium text-white disabled:opacity-30">
        {pick ? "이 일정으로 예약 확인" : "일정을 골라 주세요"}
      </button>
    </Footer>
    </>
  );
}

// 공식 지점 페이지의 사진 슬라이더와 같은 형태: 가로 스냅 스크롤 + 오른쪽 아래 "01 / 08" 배지(현재 번호만 굵게)
// Swiper 대신 CSS: snap-always로 한 번에 한 장, overscroll-x-contain으로 브라우저 뒤로가기 제스처 차단, 스크롤바 숨김
function Gallery({ ids, alt }: { ids: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="relative -mx-5 -mt-4">
      <div onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))} className="flex snap-x snap-mandatory gap-0.5 overflow-x-auto overscroll-x-contain [scrollbar-width:none]">
        {ids.map((id, n) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={id} src={imageUrl(id, 768)} alt={alt} loading={n === 0 ? "eager" : "lazy"} className="aspect-[430/303] w-full shrink-0 snap-start snap-always object-cover" />
        ))}
      </div>
      <p aria-live="polite" className="absolute bottom-3 right-3 rounded-full bg-black/45 px-2.5 py-1 text-xs leading-none text-white">
        <b className="font-semibold">{pad(i + 1)}</b> / {pad(ids.length)}
      </p>
    </div>
  );
}

function EditForm({ c, onSave }: { c: SearchConditions; onSave: (say: string, c: SearchConditions) => void }) {
  const [checkIn, setCheckIn] = useState(c.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(c.checkOut ?? "");
  const [guests, setGuests] = useState(c.guests ?? 2);
  const valid = !!checkIn && !!checkOut;
  const step = "flex size-10 shrink-0 items-center justify-center rounded-full border border-line disabled:text-line";
  return (
    <>
    <Body>
      {c.dateRange && <p className="mb-4 text-label text-sub">지금 찾는 일정: {datesText(c)}</p>}
      <DateRange checkIn={checkIn} checkOut={checkOut} focus={c.dateRange?.from} onChange={(a, b) => { setCheckIn(a); setCheckOut(b); }} />
    </Body>
    <Footer>
      {/* 공식 사이트 홈 검색의 인원 행과 같은 형태 */}
      <div className="flex flex-wrap items-center gap-y-2">
        <span className="text-body font-bold">인원</span>
        <span className="ml-2 text-xs text-mute">36개월 이하 영유아 제외</span>
        <div className="ml-auto flex items-center gap-3">
          <button type="button" aria-label="인원 줄이기" disabled={guests <= 1} onClick={() => setGuests(guests - 1)} className={step}><Icon name="minus" /></button>
          <span className="w-8 text-center text-body font-bold">{guests}명</span>
          <button type="button" aria-label="인원 늘리기" disabled={guests >= MAX_GUESTS} onClick={() => setGuests(guests + 1)} className={step}><Icon name="plus" /></button>
        </div>
      </div>
      <button
        disabled={!valid}
        onClick={() => onSave(`${stayText(checkIn, checkOut)}, ${guests}명으로 바꿀게요`, { ...c, checkIn, checkOut, dateRange: null, nights: null, weekend: null, guests })}
        className="min-h-[3.125rem] w-full rounded-card bg-ink text-body font-medium text-white disabled:bg-line disabled:text-mute"
      >
        완료
      </button>
    </Footer>
    </>
  );
}

// 네이티브 <dialog> 하나. 모바일은 전체 화면, PC(lg)는 가운데 모달.
// 헤더와 푸터는 고정하고 가운데 본문만 스크롤한다: children은 <Body>와 <Footer>로 나눠 넣는다
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
      className="m-0 mt-auto h-dvh max-h-none w-full max-w-full flex-col bg-white p-0 backdrop:bg-black/50 open:flex lg:m-auto lg:max-h-[85dvh] lg:max-w-[460px] lg:rounded-card"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="text-title font-bold">{title}</h2>
        {/* 공식 시트의 닫기 버튼(28px 원, 회색 면)을 터치 영역 40px로 키웠다 */}
        <button onClick={onClose} aria-label="닫기" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface">
          <Icon name="x" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

const Body = ({ children }: { children: ReactNode }) => <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>;
const Footer = ({ children }: { children: ReactNode }) => <div className="shrink-0 space-y-3 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{children}</div>;
