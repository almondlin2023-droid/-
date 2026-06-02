/** GET /api/v1/tasks/[id]/report — 报告完整数据 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { MOCK_REPORT_FULL } from "@/lib/mock-data";
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
  const engineRes = await callEngine(`/api/v1/tasks/${id}/report`, token);
  if (engineRes) {
    if ("error" in engineRes) {
      return NextResponse.json({ error: engineRes.error }, { status: engineRes.status as number });
    }
    return NextResponse.json(engineRes);
  }

  // 回退: Supabase → mock
  const db = getDB();
  if (db) {
    const { data: snapshot, error } = await db.from("report_snapshots")
      .select("data").eq("task_id", id).single();
    if (!error && snapshot?.data) return NextResponse.json({ data: snapshot.data });
  }

  const report = MOCK_REPORT_FULL[id as keyof typeof MOCK_REPORT_FULL];
  if (!report) return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  return NextResponse.json({ data: report });
}
