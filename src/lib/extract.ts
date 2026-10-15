import { generateText, Output, type ModelMessage } from "ai";
import { RULES } from "./rules";
import { SearchConditions, type Turn } from "./schema";

const DAY = "일월화수목금토";

const day = (d: Date) => DAY[d.getUTCDay()];
const iso = (d: Date) => d.toISOString().slice(0, 10);

// 모델은 요일 계산을 자주 틀린다(eval v1: "다음주"를 이번 주로 계산). 계산 대신 찾아보게 달력을 준다
function calendar(referenceDate: string, weeks = 14): string {
  const ref = new Date(`${referenceDate}T00:00:00Z`);
  const monday = new Date(ref);
  monday.setUTCDate(ref.getUTCDate() - ((ref.getUTCDay() + 6) % 7));
  const label = (w: number) => (w === 0 ? "이번주" : w === 1 ? "다음주" : `${w}주 후`);
  return Array.from({ length: weeks }, (_, w) => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + w * 7 + i);
      return `${day(d)} ${iso(d)}`;
    });
    return `- ${label(w)}: ${days.join(", ")}`;
  }).join("\n");
}

function systemPrompt(referenceDate: string): string {
  const ref = new Date(`${referenceDate}T00:00:00Z`);
  return `${RULES}\n\n기준일(오늘): ${referenceDate} (${day(ref)})\n\n## 달력 (날짜와 요일은 계산하지 말고 여기서 찾는다)\n${calendar(referenceDate)}`;
}

// 여러 턴을 메시지 배열로 주면 작은 모델이 앞 대화를 잊었다(eval v1: m04, m05). 대화록 하나로 준다
function transcript(turns: Turn[]): string {
  return turns.map((t) => `${t.role === "user" ? "고객" : "상담원"}: ${t.text}`).join("\n");
}

export type Reasoning = "none" | "minimal" | "low" | "medium" | "provider-default";

// normalize는 화면(클라이언트)에서도 쓰므로 AI SDK를 import하지 않는 파일에 둔다
import { normalize } from "./normalize";

export async function extract(
  input: string | Turn[],
  opts: { model: string; referenceDate: string; reasoning?: Reasoning },
) {
  const turns = typeof input === "string" ? [{ role: "user" as const, text: input }] : input;
  const messages: ModelMessage[] = [{ role: "user", content: `대화:\n${transcript(turns)}` }];
  const started = Date.now();
  const result = await generateText({
    model: opts.model, // AI Gateway "provider/model" 문자열
    system: systemPrompt(opts.referenceDate),
    messages,
    output: Output.object({ schema: SearchConditions }),
    reasoning: opts.reasoning ?? "none", // 추론 토큰도 출력으로 과금되고 응답이 느려진다 (eval v0: 건당 700~1,000토큰)
    maxRetries: 5, // 무료 등급 요청 한도(429) 대비
  });
  return { conditions: normalize(result.output), usage: result.usage, latencyMs: Date.now() - started };
}
