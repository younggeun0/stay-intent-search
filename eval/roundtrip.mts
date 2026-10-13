// 화면에서 조건을 바꿀 때 대화에 남기는 문구(칩 ×, 대안 버튼)가 다음 추출에서 의도한 조건으로 해석되는지 확인한다.
// 바꾼 조건이 다음 메시지에서 되살아나지 않으려면 이 왕복이 맞아야 한다. 실제 모델을 호출한다(1회 약 $0.005)
import { extract } from "../src/lib/extract";
import { normalize } from "../src/lib/normalize";
import { search } from "../src/lib/search";
import { chips, reply } from "../src/lib/reply";
import { wrongFields } from "./score";
const opts = { model: "openai/gpt-6-luna", referenceDate: "2026-10-13" };
const first = ["다음주 금토 부산 바다 보이는 욕조 있는 방, 둘이요", "강아지랑 이번 주말 속초 오션뷰 2명", "인천 송도 휠체어 쓰시는 할머니랑 3명 10/24 1박", "양양 복층 욕조 있는 방 이번 주말 2명"];
let fails = 0;
for (const q of first) {
  const t0 = [{ role: "user" as const, text: q }];
  const c0 = (await extract(t0, opts)).conditions;
  const r0 = search(c0);
  const edits = [...chips(c0).map((k) => ({ say: k.say, c: normalize({ ...c0, ...k.patch }) })), ...r0.relaxations.map((o) => ({ say: o.says.join(", "), c: normalize(o.conditions) }))];
  for (const e of edits) {
    const turns = [...t0, { role: "assistant" as const, text: reply(c0, r0) }, { role: "user" as const, text: e.say }];
    const got = (await extract(turns, opts)).conditions;
    const wrong = wrongFields(e.c, got).filter((f) => f !== "unhandled");
    if (wrong.length) fails++;
    console.log(wrong.length ? "✗" : "✓", JSON.stringify(e.say), wrong.length ? wrong.map((f) => `${f}: 기대 ${JSON.stringify(e.c[f])} 실제 ${JSON.stringify(got[f])}`).join("; ") : "");
  }
}
console.log("실패", fails);
