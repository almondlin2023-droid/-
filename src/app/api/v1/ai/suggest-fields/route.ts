/**
 * POST /api/v1/ai/suggest-fields — AI 字段识别推荐
 *
 * PRD §5.1.2 三层识别策略编排：
 *   L1 LLM 语义理解 → L2 数据值特征匹配 → L3 全局模式推断
 * V1 返回模拟推荐结果，对接 OpenAI 后替换。
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { MOCK_AI_FIELD_SUGGESTIONS } from "@/lib/mock-data";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await request.json();
  // body: { file_storage_path, station_id?, user_history? }

  // 模拟 LLM 调用延迟
  await new Promise((resolve) => setTimeout(resolve, 800));

  // TODO: 替换为真实 OpenAI API 调用 (GPT-4o-mini)
  // PRD §5.1.2: 上下文 = 整行表头 + 用户历史映射 + 光伏领域知识
  return NextResponse.json({
    data: MOCK_AI_FIELD_SUGGESTIONS,
    meta: {
      model: "gpt-4o-mini (mock)",
      latency_ms: 800,
      strategy: "L1_LLM_SEMANTIC",
    },
  });
}
