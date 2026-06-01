/**
 * 任务详情 API
 * GET /api/v1/tasks/[id] — 获取任务详情（含摘要、文件、映射记录）
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { MOCK_TASKS } from "@/lib/mock-data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const task = MOCK_TASKS[id];
  if (!task) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  // TODO: 替换为真实引擎调用
  return NextResponse.json({ data: task });
}
