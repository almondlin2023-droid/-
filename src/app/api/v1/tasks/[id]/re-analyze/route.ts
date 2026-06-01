/**
 * POST /api/v1/tasks/[id]/re-analyze — 重新测算
 *
 * PRD §4.2.3：基于该任务的数据文件和映射，以当前电站配置重新执行诊断。
 * 用于电站配置变更后重新评估历史任务。
 */
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // TODO: 替换为真实引擎调用
  return NextResponse.json({
    data: {
      task_id: id,
      status: "analyzing",
      message: "重新测算已触发，使用当前电站配置重新执行诊断管线",
    },
  });
}
