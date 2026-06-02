/**
 * GET /api/v1/stations/[id]/tasks/compare?task_ids=id1,id2
 *
 * PRD §4.2.3 任务对比：返回 2-3 个任务并排对比数据。
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { MOCK_TASKS } from "@/lib/mock-data";
import { getDB } from "@/lib/data-access";
import { callEngine } from "@/lib/engine-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: stationId } = await params;
  const { userId, getToken } = await auth();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const taskIds = searchParams.get("task_ids")?.split(",") ?? [];

  if (taskIds.length < 2 || taskIds.length > 3) {
    return NextResponse.json({ error: "请选择 2-3 个任务进行对比" }, { status: 400 });
  }

  // 优先调用 engine API
  const token = await getToken();
  const engineRes = await callEngine(
    `/api/v1/stations/${stationId}/tasks/compare?task_ids=${taskIds.join(",")}`,
    token,
  );
  if (engineRes) {
    if ("error" in engineRes) {
      return NextResponse.json({ error: engineRes.error }, { status: engineRes.status as number });
    }
    return NextResponse.json(engineRes);
  }

  // 回退: Supabase → mock
  const db = getDB();
  if (db) {
    const { data: tasks, error } = await db.from("diagnosis_tasks")
      .select("*").in("id", taskIds).eq("station_id", stationId).eq("owner_id", userId);
    if (!error && tasks && tasks.length >= 2) {
      return NextResponse.json({ data: tasks });
    }
    if (tasks && tasks.length < 2) {
      return NextResponse.json({ error: "所选任务不存在或不属于同一电站" }, { status: 404 });
    }
  }

  const tasks = taskIds
    .map((tid) => MOCK_TASKS[tid])
    .filter(Boolean)
    .filter((t) => t.station_id === stationId);

  if (tasks.length < 2) {
    return NextResponse.json({ error: "所选任务不存在或不属于同一电站" }, { status: 404 });
  }

  return NextResponse.json({ data: tasks });
}
