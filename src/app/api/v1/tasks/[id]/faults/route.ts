/** GET /api/v1/tasks/[id]/faults — 故障事件列表 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { MOCK_FAULT_EVENTS } from "@/lib/mock-data";
import { getDB } from "@/lib/data-access";
import { callEngine } from "@/lib/engine-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId, getToken } = await auth();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  // 优先调用 engine API
  const token = await getToken();
  const engineRes = await callEngine(`/api/v1/tasks/${id}/faults`, token);
  if (engineRes) {
    if ("error" in engineRes) {
      return NextResponse.json({ error: engineRes.error }, { status: engineRes.status as number });
    }
    return NextResponse.json(engineRes);
  }

  // 回退: Supabase → mock
  const db = getDB();
  if (db) {
    const { data: faults, error } = await db.from("fault_events")
      .select("*").eq("task_id", id);
    if (!error) return NextResponse.json({ data: faults ?? [] });
  }

  const faults = MOCK_FAULT_EVENTS[id];
  return NextResponse.json({ data: faults ?? [] });
}
