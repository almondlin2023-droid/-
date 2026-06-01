/** GET /api/v1/tasks/[id]/faults — 故障事件列表 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { MOCK_FAULT_EVENTS } from "@/lib/mock-data";
import { getDB } from "@/lib/data-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const db = getDB();
  if (db) {
    const { data: faults, error } = await db.from("fault_events")
      .select("*").eq("task_id", id);
    if (!error) return NextResponse.json({ data: faults ?? [] });
  }

  // 回退到 mock 数据
  const faults = MOCK_FAULT_EVENTS[id];
  return NextResponse.json({ data: faults ?? [] });
}
