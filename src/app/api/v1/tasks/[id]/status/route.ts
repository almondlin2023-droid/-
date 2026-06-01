/**
 * 任务状态轮询 API
 * GET /api/v1/tasks/[id]/status — 获取任务状态（用于分析进度轮询）
 *
 * PRD §4.2 异步诊断流程：前端每 3 秒轮询此接口获取进度。
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { MOCK_TASKS } from "@/lib/mock-data";
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
    const { data: task, error } = await db.from("diagnosis_tasks")
      .select("status").eq("id", id).eq("owner_id", userId).single();
    if (!error && task) {
      const progress = task.status === "completed" ? 100
        : task.status === "analyzing" ? Math.min(95, Math.floor(Date.now() / 1000) % 100)
        : 0;
      const steps = [
        { at: 0, text: "数据质量检查中..." },
        { at: 15, text: "GTI 辐照度换面计算(Hay&Davies)..." },
        { at: 30, text: "PR 计算与基准对比..." },
        { at: 45, text: "14 项损失管线运行中..." },
        { at: 65, text: "故障事件识别(5min帧扫描)..." },
        { at: 80, text: "报告数据聚合与格式化..." },
        { at: 92, text: "损失优化建议生成中..." },
      ];
      const currentStep = [...steps].reverse().find((s) => progress >= s.at)?.text ?? steps[0].text;
      return NextResponse.json({
        data: { status: task.status, progress, currentStep, estimated_remaining_s: task.status === "analyzing" ? Math.round((100 - progress) / 3) : 0 },
      });
    }
  }

  // 回退到 mock 数据
  const task = MOCK_TASKS[id];
  if (!task) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }
  const progress = task.status === "completed" ? 100
    : task.status === "analyzing" ? Math.min(95, Math.floor(Date.now() / 1000) % 100)
    : 0;
  const steps = [
    { at: 0, text: "数据质量检查中..." },
    { at: 15, text: "GTI 辐照度换面计算(Hay&Davies)..." },
    { at: 30, text: "PR 计算与基准对比..." },
    { at: 45, text: "14 项损失管线运行中..." },
    { at: 65, text: "故障事件识别(5min帧扫描)..." },
    { at: 80, text: "报告数据聚合与格式化..." },
    { at: 92, text: "损失优化建议生成中..." },
  ];
  const currentStep = [...steps].reverse().find((s) => progress >= s.at)?.text ?? steps[0].text;
  return NextResponse.json({
    data: {
      status: task.status,
      progress,
      currentStep,
      estimated_remaining_s: task.status === "analyzing" ? Math.round((100 - progress) / 3) : 0,
    },
  });
}
