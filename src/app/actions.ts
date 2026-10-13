"use server";
// 유일한 서버 엔드포인트. 공개 POST로 호출될 수 있으므로 입력을 검증하고 크기를 제한한다(유료 크레딧 소모 방지)
import { z } from "zod";
import { extract } from "@/lib/extract";
import { Turn, type SearchConditions } from "@/lib/schema";

const MODEL = "openai/gpt-6-luna"; // eval 2026-10-13: dev 35/37 (docs/ai-log.md)
const Input = z.array(Turn.extend({ text: z.string().min(1).max(300) })).min(1).max(20);

// 기준일은 서버에서 한국 날짜로 계산한다 (toISOString은 UTC라 자정~오전 9시에 하루 틀린다)
const todayKst = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());

export type Interpreted = { ok: true; conditions: SearchConditions; referenceDate: string } | { ok: false; error: string };

export async function interpret(turns: Turn[]): Promise<Interpreted> {
  const parsed = Input.safeParse(turns);
  if (!parsed.success) return { ok: false, error: "메시지가 너무 길거나 대화가 너무 길어요. 새로 시작해 주세요." };
  const referenceDate = todayKst();
  try {
    const { conditions } = await extract(parsed.data, { model: MODEL, referenceDate });
    return { ok: true, conditions, referenceDate };
  } catch (e) {
    console.error("interpret failed", e);
    const busy = /rate limit|429|credit|budget|quota/i.test(String(e));
    return { ok: false, error: busy ? "지금 요청이 많아요. 잠시 후 다시 보내 주세요." : "조건을 이해하지 못했어요. 다시 말씀해 주세요." };
  }
}
