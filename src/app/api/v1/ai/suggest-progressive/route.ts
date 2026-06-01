/**
 * POST /api/v1/ai/suggest-progressive — 渐进式智能推荐
 *
 * PRD §5.1.4：基于用户已确认的字段映射，推断同文件中的模式规律
 * （如三列重复结构、对称列对等），给出后续字段的推荐。
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { MOCK_AI_PROGRESSIVE_SUGGESTIONS } from "@/lib/mock-data";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await request.json();
  // body: { file_storage_path, confirmed_fields: [{col_index, field_code}] }

  // 模拟推理延迟
  await new Promise((resolve) => setTimeout(resolve, 400));

  // TODO: 替换为真实 OpenAI API 调用 (GPT-4o-mini 模式匹配)
  return NextResponse.json({
    data: MOCK_AI_PROGRESSIVE_SUGGESTIONS,
    meta: {
      model: "gpt-4o-mini (mock)",
      latency_ms: 400,
      strategy: "L3_GLOBAL_PATTERN",
    },
  });
}
