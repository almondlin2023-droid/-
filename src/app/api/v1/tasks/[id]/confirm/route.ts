/**
 * 确认映射 → 触发诊断
 * POST /api/v1/tasks/[id]/confirm — 确认字段映射并触发异步诊断
 *
 * PRD §4.2.1 生命周期：pending → analyzing
 * 技术架构 §4.2：Celery Worker 异步执行诊断（V1 模拟为同步响应）
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { MOCK_TASKS } from "@/lib/mock-data";
import { getDB } from "@/lib/data-access";
import { callEngine } from "@/lib/engine-client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId, getToken } = await auth();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  // 优先调用 engine API
  const token = await getToken();
  const engineRes = await callEngine(`/api/v1/tasks/${id}/confirm`, token, { method: "POST" });
  if (engineRes) {
    if ("error" in engineRes) {
      return NextResponse.json({ error: engineRes.error }, { status: engineRes.status as number });
    }
    return NextResponse.json(engineRes);
  }

  // 回退: Supabase → mock
  const db = getDB();
  if (db) {
    const { data: task, error } = await db.from("diagnosis_tasks")
      .select("status").eq("id", id).eq("owner_id", userId).single();
    if (error || !task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }
    if (task.status !== "pending") {
      return NextResponse.json({ error: "仅待映射状态的任务可确认" }, { status: 409 });
    }
    await db.from("diagnosis_tasks")
      .update({ status: "analyzing" }).eq("id", id);
    return NextResponse.json({
      data: { task_id: id, status: "analyzing", message: "诊断任务已触发，预计60秒内完成 (PRD §5.1.5)" },
    });
  }

  const task = MOCK_TASKS[id];
  if (!task) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }
  if (task.status !== "pending") {
    return NextResponse.json({ error: "仅待映射状态的任务可确认" }, { status: 409 });
  }

  return NextResponse.json({
    data: {
      task_id: id,
      status: "analyzing",
      message: "诊断任务已触发，预计60秒内完成 (PRD §5.1.5)",
    },
  });
}
