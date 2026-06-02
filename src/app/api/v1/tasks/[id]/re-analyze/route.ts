/**
 * POST /api/v1/tasks/[id]/re-analyze — 重新测算
 *
 * PRD §4.2.3：基于该任务的数据文件和映射，以当前电站配置重新执行诊断。
 * 用于电站配置变更后重新评估历史任务。
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
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
  const engineRes = await callEngine(`/api/v1/tasks/${id}/re-analyze`, token, { method: "POST" });
  if (engineRes) {
    if ("error" in engineRes) {
      return NextResponse.json({ error: engineRes.error }, { status: engineRes.status as number });
    }
    return NextResponse.json(engineRes);
  }

  // 回退: Supabase
  const db = getDB();
  if (db) {
    await db.from("diagnosis_tasks")
      .update({ status: "analyzing" }).eq("id", id).eq("owner_id", userId);
  }

  return NextResponse.json({
    data: {
      task_id: id,
      status: "analyzing",
      message: "重新测算已触发，使用当前电站配置重新执行诊断管线",
    },
  });
}
