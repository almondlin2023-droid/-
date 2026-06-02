/** GET /api/v1/tasks/[id]/losses — 损失分解数据 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { MOCK_DIAGNOSIS_LOSSES } from "@/lib/mock-data";
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
  const engineRes = await callEngine(`/api/v1/tasks/${id}/losses`, token);
  if (engineRes) {
    if ("error" in engineRes) {
      return NextResponse.json({ error: engineRes.error }, { status: engineRes.status as number });
    }
    return NextResponse.json(engineRes);
  }

  // 回退: Supabase → mock
  const db = getDB();
  if (db) {
    const { data: losses, error } = await db.from("diagnosis_losses")
      .select("*").eq("task_id", id);
    if (!error && losses?.length) return NextResponse.json({ data: losses });
  }

  const losses = MOCK_DIAGNOSIS_LOSSES[id];
  if (!losses) return NextResponse.json({ error: "无损失数据" }, { status: 404 });
  return NextResponse.json({ data: losses });
}
