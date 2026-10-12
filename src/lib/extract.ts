import { generateText, Output, type ModelMessage } from "ai";
import { RULES } from "./rules";
import { SearchConditions, type Turn } from "./schema";

const DAY = "일월화수목금토";

export function systemPrompt(referenceDate: string): string {
  const dow = DAY[new Date(`${referenceDate}T00:00:00Z`).getUTCDay()];
  return `${RULES}\n\n기준일(오늘): ${referenceDate} (${dow})`;
}

export async function extract(input: string | Turn[], opts: { model: string; referenceDate: string }) {
  const turns = typeof input === "string" ? [{ role: "user" as const, text: input }] : input;
  const messages: ModelMessage[] = turns.map((t) => ({ role: t.role, content: t.text }));
  const started = Date.now();
  const result = await generateText({
    model: opts.model, // AI Gateway "provider/model" 문자열
    system: systemPrompt(opts.referenceDate),
    messages,
    output: Output.object({ schema: SearchConditions }),
    reasoning: "low", // 추출은 짧은 작업이라 추론을 최소로. 추론 토큰도 출력으로 과금된다
  });
  return { conditions: result.output, usage: result.usage, latencyMs: Date.now() - started };
}
