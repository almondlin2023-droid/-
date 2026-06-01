/** GET /api/v1/tasks/[id]/report — 报告完整数据 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { MOCK_REPORT_FULL } from "@/lib/mock-data";
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
    const { data: snapshot, error } = await db.from("report_snapshots")
      .select("data").eq("task_id", id).single();
    if (!error && snapshot?.data) return NextResponse.json({ data: snapshot.data });
  }

  // 回退到 mock 数据
  const report = MOCK_REPORT_FULL[id as keyof typeof MOCK_REPORT_FULL];
  if (!report) return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  return NextResponse.json({ data: report });
}
