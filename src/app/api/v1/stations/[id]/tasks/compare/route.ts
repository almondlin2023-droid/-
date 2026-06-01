/**
 * GET /api/v1/stations/[id]/tasks/compare?task_ids=id1,id2
 *
 * PRD §4.2.3 任务对比：返回 2-3 个任务并排对比数据。
 */
import { NextRequest, NextResponse } from "next/server";
import { MOCK_TASKS } from "@/lib/mock-data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: stationId } = await params;
  const { searchParams } = new URL(request.url);
  const taskIds = searchParams.get("task_ids")?.split(",") ?? [];

  if (taskIds.length < 2 || taskIds.length > 3) {
    return NextResponse.json({ error: "请选择 2-3 个任务进行对比" }, { status: 400 });
  }

  const tasks = taskIds
    .map((tid) => MOCK_TASKS[tid])
    .filter(Boolean)
    .filter((t) => t.station_id === stationId);

  if (tasks.length < 2) {
    return NextResponse.json({ error: "所选任务不存在或不属于同一电站" }, { status: 404 });
  }

  // TODO: 替换为真实引擎调用
  return NextResponse.json({ data: tasks });
}
