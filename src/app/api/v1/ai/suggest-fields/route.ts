/**
 * POST /api/v1/ai/suggest-fields — AI 字段识别推荐
 *
 * PRD §5.1.2 三层识别策略编排：
 *   L1 LLM 语义理解 → L2 数据值特征匹配 → L3 全局模式推断
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { MOCK_AI_FIELD_SUGGESTIONS } from "@/lib/mock-data";
import { callEngine } from "@/lib/engine-client";

export async function POST(request: NextRequest) {
  const { getToken } = await auth();

  const body = await request.json();

  // 优先调用 engine API
  const token = await getToken();
  const engineRes = await callEngine("/api/v1/ai/suggest-fields", token, { method: "POST", body });
  if (engineRes) {
    if ("error" in engineRes) {
      return NextResponse.json({ error: engineRes.error }, { status: engineRes.status as number });
    }
    return NextResponse.json(engineRes);
  }

  // 回退到 mock 数据
  await new Promise((resolve) => setTimeout(resolve, 800));
  return NextResponse.json({
    data: MOCK_AI_FIELD_SUGGESTIONS,
    meta: {
      model: "gpt-4o-mini (mock)",
      latency_ms: 800,
      strategy: "L1_LLM_SEMANTIC",
    },
  });
}
