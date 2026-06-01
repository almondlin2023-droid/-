/**
 * 诊断任务列表 API
 *
 * GET  /api/v1/tasks  — 获取任务列表（按电站筛选）
 * POST /api/v1/tasks  — 创建诊断任务
 */

import { NextRequest, NextResponse } from "next/server";
import { getTasksList } from "@/lib/mock-data";

export async function GET(request: NextRequest) {
  // TODO: Clerk 认证

  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get("station_id") ?? undefined;

  const tasks = getTasksList(stationId);

  // TODO: 替换为真实引擎调用
  return NextResponse.json({ data: tasks, total: tasks.length });
}

export async function POST(request: NextRequest) {
  // TODO: Clerk 认证
  const body = await request.json();

  // TODO: 替换为真实引擎调用
  const newTask = {
    id: `task-${Date.now()}`,
    owner_id: "user-1",
    status: "pending" as const,
    created_at: new Date().toISOString(),
    ...body,
  };

  return NextResponse.json({ data: newTask }, { status: 201 });
}
