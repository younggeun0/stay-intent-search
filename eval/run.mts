// 사용법: npm run eval:run -- --models anthropic/claude-haiku-5.5,openai/gpt-6-luna --split dev --label v1
// holdout은 마지막에 한 번만 돌린다 (eval/README.md). 결과는 eval/results/에 저장한다.
import { mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { extract, type Reasoning } from "../src/lib/extract";
import { cases } from "./cases";
import { clarifyErrors, FIELDS, wrongFields, type Field } from "./score";

// 100만 토큰당 USD. AI Gateway /v1/models에서 2026-10-13 확인. 캐시 할인은 반영하지 않아 실제보다 약간 높게 나온다
// 앞의 세 개는 AI Gateway 무료 등급에서 호출 가능, 나머지는 유료 크레딧 필요 (2026-10-13 직접 호출로 확인)
const PRICES: Record<string, { input: number; output: number }> = {
  "openai/gpt-5-nano": { input: 0.05, output: 0.4 },
  "openai/gpt-4.1-nano": { input: 0.1, output: 0.4 },
  "google/gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
  "anthropic/claude-haiku-5.5": { input: 0.1, output: 0.5 },
  "openai/gpt-6-luna": { input: 0.1, output: 0.5 },
};
// "추론 없음"을 지원하지 않는 모델의 최소 설정 (eval v1: gpt-5-nano는 none 거부)
const MIN_REASONING: Record<string, Reasoning> = { "openai/gpt-5-nano": "minimal" };
const FREE_TIER = ["openai/gpt-5-nano", "openai/gpt-4.1-nano", "google/gemini-2.5-flash-lite"];

const { values } = parseArgs({
  options: {
    models: { type: "string", default: FREE_TIER.join(",") },
    reasoning: { type: "string", default: "none" },
    split: { type: "string", default: "dev" },
    label: { type: "string", default: "adhoc" },
    concurrency: { type: "string", default: "2" },
  },
});
const split = values.split as "dev" | "holdout";
const selected = cases.filter((c) => c.split === split);
if (split === "holdout") console.warn("⚠ holdout 측정: 이 결과를 보고 프롬프트를 고치지 않는다.\n");

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

const pct = (a: number, b: number) => `${((a / b) * 100).toFixed(0)}%`;
const report: Record<string, unknown> = {};

for (const model of values.models.split(",")) {
  const price = PRICES[model];
  if (!price) throw new Error(`가격 미등록 모델: ${model}`);

  const rows = await pool(selected, Number(values.concurrency), async (c) => {
    try {
      const r = await extract(c.input, { model, referenceDate: c.referenceDate, reasoning: values.reasoning === "none" ? (MIN_REASONING[model] ?? "none") : (values.reasoning as Reasoning) });
      const cost = ((r.usage.inputTokens ?? 0) * price.input + (r.usage.outputTokens ?? 0) * price.output) / 1e6;
      return { id: c.id, actual: r.conditions, wrong: wrongFields(c.expected, r.conditions),
        clarify: clarifyErrors(c.expected, r.conditions), latencyMs: r.latencyMs, cost,
        reasoningTokens: r.usage.outputTokenDetails?.reasoningTokens ?? 0 };
    } catch (e) {
      // 인증·결제 오류는 모든 케이스가 같은 이유로 실패하므로 바로 중단한다
      if (/credit card|Free tier|Unauthenticated|Authentication/i.test(String(e))) throw e;
      return { id: c.id, error: String(e).slice(0, 300), wrong: [...FIELDS] as Field[], latencyMs: 0, cost: 0 };
    }
  });

  const ok = rows.filter((r) => r.wrong.length === 0).length;
  const errors = rows.filter((r) => "error" in r).length;
  const fieldHits = rows.reduce((s, r) => s + FIELDS.length - r.wrong.length, 0);
  const missed = rows.filter((r) => "clarify" in r && r.clarify!.missed.length).length;
  const extra = rows.filter((r) => "clarify" in r && r.clarify!.extra.length).length;
  const lat = rows.filter((r) => !("error" in r)).map((r) => r.latencyMs).sort((a, b) => a - b);
  const p = (q: number) => lat[Math.min(lat.length - 1, Math.floor(lat.length * q))] ?? 0;
  const cost = rows.reduce((s, r) => s + r.cost, 0);
  const byField = Object.fromEntries(FIELDS.map((f) => [f, rows.filter((r) => r.wrong.includes(f)).length]).filter(([, n]) => n));

  console.log(`\n■ ${model} (${split} ${rows.length}건, reasoning=${values.reasoning})`);
  console.log(`  케이스 정답 ${ok}/${rows.length} (${pct(ok, rows.length)}) · 필드 정답 ${pct(fieldHits, rows.length * FIELDS.length)} · 오류 ${errors}건`);
  console.log(`  되묻기: 물어야 하는데 안 물음 ${missed}건 · 안 물어도 되는데 물음 ${extra}건`);
  console.log(`  지연 p50 ${p(0.5)}ms · p95 ${p(0.95)}ms · 비용 합계 $${cost.toFixed(4)} (건당 $${(cost / rows.length).toFixed(5)})`);
  console.log(`  필드별 오답: ${JSON.stringify(byField)}`);
  for (const r of rows.filter((r) => r.wrong.length)) {
    console.log(`  ✗ ${r.id}: ${"error" in r ? `오류 ${r.error}` : r.wrong.join(", ")}`);
  }
  report[model] = { ok, total: rows.length, errors, fieldAccuracy: fieldHits / (rows.length * FIELDS.length),
    clarifyMissed: missed, clarifyExtra: extra, p50: p(0.5), p95: p(0.95), cost, byField, rows };
}

mkdirSync("eval/results", { recursive: true });
const file = `eval/results/${new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })}_${values.label}_${split}.json`;
writeFileSync(file, JSON.stringify({ label: values.label, split, reasoning: values.reasoning, ranAt: new Date().toISOString(), report }, null, 2));
console.log(`\n결과 저장: ${file}`);
