/** GET /api/v1/tasks/[id]/losses — 损失分解数据 */
import { NextRequest, NextResponse } from "next/server";
import { MOCK_DIAGNOSIS_LOSSES } from "@/lib/mock-data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const losses = MOCK_DIAGNOSIS_LOSSES[id];
  if (!losses) return NextResponse.json({ error: "无损失数据" }, { status: 404 });
  return NextResponse.json({ data: losses });
}
