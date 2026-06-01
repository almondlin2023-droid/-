/**
 * 任务状态轮询 API
 * GET /api/v1/tasks/[id]/status — 获取任务状态（用于分析进度轮询）
 *
 * PRD §4.2 异步诊断流程：前端每 3 秒轮询此接口获取进度。
 */

import { NextRequest, NextResponse } from "next/server";
import { MOCK_TASKS } from "@/lib/mock-data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const task = MOCK_TASKS[id];
  if (!task) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  // 模拟分析进度（0-100，已完成的永远返回100）
  const progress = task.status === "completed" ? 100
    : task.status === "analyzing" ? Math.min(95, Math.floor(Date.now() / 1000) % 100)
    : 0;

  // TODO: 替换为真实引擎调用
  return NextResponse.json({
    data: {
      status: task.status,
      progress,
      estimated_remaining_s: task.status === "analyzing" ? Math.round((100 - progress) / 3) : 0,
    },
  });
}
