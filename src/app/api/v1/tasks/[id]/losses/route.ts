/** GET /api/v1/tasks/[id]/losses — 损失分解数据 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { MOCK_DIAGNOSIS_LOSSES } from "@/lib/mock-data";
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
    const { data: losses, error } = await db.from("diagnosis_losses")
      .select("*").eq("task_id", id);
    if (!error && losses?.length) return NextResponse.json({ data: losses });
  }

  // 回退到 mock 数据
  const losses = MOCK_DIAGNOSIS_LOSSES[id];
  if (!losses) return NextResponse.json({ error: "无损失数据" }, { status: 404 });
  return NextResponse.json({ data: losses });
}
