"use client";

/**
 * 诊断任务详情页
 *
 * 展示单个诊断任务的完整信息、进度状态和操作入口。
 * PRD §4.2 任务实体：每个任务有完整的生命周期状态。
 *
 * 功能：
 *   - 状态驱动的UI渲染（pending/analyzing/completed/failed）
 *   - 分析中状态实时轮询进度（模拟）
 *   - 任务基本信息 + 诊断范围 + 数据文件 + 字段映射记录
 *   - 已完成任务：关键指标摘要 + 跳转报告
 *   - 操作入口：查看报告/重新测算/对比/删除
 *   - 用户反馈标记（PRD §4.2.2）
 */

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  Calendar,
  FileText,
  FileSpreadsheet,
  Download,
  ExternalLink,
  RefreshCw,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/diagnosis";

// ── 任务状态配置 ──
const TASK_STATUS_CONFIG: Record<Task["status"], { icon: React.ComponentType<{ className?: string }>; label: string; color: string; bgColor: string }> = {
  pending: { icon: Clock, label: "待映射", color: "text-zinc-500", bgColor: "bg-zinc-100" },
  analyzing: { icon: Loader2, label: "分析中", color: "text-blue-600", bgColor: "bg-blue-50" },
  completed: { icon: CheckCircle2, label: "已完成", color: "text-green-600", bgColor: "bg-green-50" },
  failed: { icon: XCircle, label: "已失败", color: "text-red-600", bgColor: "bg-red-50" },
};

// ── 模拟任务数据（单个任务详情） ──
const MOCK_TASKS: Record<string, (Task & { stationName: string; files?: MockFile[]; mappingsCount?: number; losses?: MockLoss[]; equivalentHours?: number })> = {
  "task-006": {
    id: "task-006", station_id: "st-001", owner_id: "user-1",
    status: "pending", stationName: "西郊分布式光伏电站",
    scope: { sub_station_ids: ["sub-001"], date_range: { start: "2025-04-01", end: "2025-04-15" } },
    created_at: "2025-04-01T09:00:00Z",
    files: [{ id: "f-001", name: "INV_202504.csv", size: 2457600, rowCount: 4320, timeStart: "2025-04-01T00:00:00Z", timeEnd: "2025-04-15T23:55:00Z", encoding: "UTF-8" }],
    mappingsCount: 2,
  },
  "task-005": {
    id: "task-005", station_id: "st-001", owner_id: "user-1",
    status: "analyzing", stationName: "西郊分布式光伏电站",
    scope: { sub_station_ids: ["sub-001", "sub-002", "sub-003"], date_range: { start: "2025-03-15", end: "2025-03-31" } },
    created_at: "2025-03-31T08:30:00Z",
    files: [
      { id: "f-101", name: "INV_A_202503.csv", size: 3200000, rowCount: 4896, timeStart: "2025-03-15T00:00:00Z", timeEnd: "2025-03-31T23:55:00Z", encoding: "UTF-8" },
      { id: "f-102", name: "INV_B_202503.csv", size: 3100000, rowCount: 4896, timeStart: "2025-03-15T00:00:00Z", timeEnd: "2025-03-31T23:55:00Z", encoding: "UTF-8" },
      { id: "f-103", name: "INV_C_202503.csv", size: 3050000, rowCount: 4896, timeStart: "2025-03-15T00:00:00Z", timeEnd: "2025-03-31T23:55:00Z", encoding: "UTF-8" },
    ],
    mappingsCount: 18,
  },
  "task-004": {
    id: "task-004", station_id: "st-001", owner_id: "user-1",
    status: "completed", stationName: "西郊分布式光伏电站",
    scope: { sub_station_ids: ["sub-001", "sub-002", "sub-003"], date_range: { start: "2025-03-01", end: "2025-03-15" } },
    summary: { pr_actual: 85.2, pr_baseline: 73.38, pr_deviation: 11.82, energy_actual_kwh: 102300, energy_baseline_kwh: 88100, energy_deviation_kwh: 14200, revenue_actual: 39999, revenue_baseline: 34445, revenue_deviation: 5554 },
    report_number: "PVAI20250315103000001",
    created_at: "2025-03-15T10:30:00Z", completed_at: "2025-03-15T10:32:00Z",
    equivalentHours: 92,
    files: [
      { id: "f-201", name: "INV_A_20250301-0315.csv", size: 4200000, rowCount: 4320, timeStart: "2025-03-01T00:00:00Z", timeEnd: "2025-03-15T23:55:00Z", encoding: "UTF-8" },
      { id: "f-202", name: "INV_B_20250301-0315.csv", size: 4100000, rowCount: 4320, timeStart: "2025-03-01T00:00:00Z", timeEnd: "2025-03-15T23:55:00Z", encoding: "UTF-8" },
      { id: "f-203", name: "INV_C_20250301-0315.csv", size: 4050000, rowCount: 4320, timeStart: "2025-03-01T00:00:00Z", timeEnd: "2025-03-15T23:55:00Z", encoding: "UTF-8" },
    ],
    mappingsCount: 18,
    losses: [
      { key: "shadow", label: "阴影损失", lossRate: 3.34, lossKwh: 3420, diagnosed: true },
      { key: "soiling", label: "灰尘损失", lossRate: 2.15, lossKwh: 2200, diagnosed: true },
      { key: "inverter_eff", label: "逆变器效率", lossRate: 1.85, lossKwh: 1890, diagnosed: false },
      { key: "degradation", label: "自然衰减", lossRate: 1.12, lossKwh: 1146, diagnosed: false },
    ],
  },
  "task-003": {
    id: "task-003", station_id: "st-002", owner_id: "user-1",
    status: "completed", stationName: "东部开发区屋顶光伏",
    scope: { sub_station_ids: ["sub-004"], date_range: { start: "2025-03-01", end: "2025-03-10" } },
    summary: { pr_actual: 79.5, pr_baseline: 72.1, pr_deviation: 7.4, energy_actual_kwh: 85000, energy_baseline_kwh: 77100, energy_deviation_kwh: 7900, revenue_actual: 33235, revenue_baseline: 30146, revenue_deviation: 3089 },
    report_number: "PVAI20250310150000002",
    created_at: "2025-03-10T15:00:00Z", completed_at: "2025-03-10T15:01:30Z",
    equivalentHours: 78,
    files: [{ id: "f-301", name: "INV_20250301-0310.xlsx", size: 3800000, rowCount: 2880, timeStart: "2025-03-01T00:00:00Z", timeEnd: "2025-03-10T23:55:00Z", encoding: "UTF-8" }],
    mappingsCount: 16,
    losses: [
      { key: "clipping", label: "限额损失", lossRate: 1.89, lossKwh: 1610, diagnosed: true },
      { key: "temperature", label: "温度损失", lossRate: 1.55, lossKwh: 1320, diagnosed: false },
    ],
  },
  "task-002": {
    id: "task-002", station_id: "st-001", owner_id: "user-1",
    status: "failed", stationName: "西郊分布式光伏电站",
    scope: { sub_station_ids: ["sub-001"], date_range: { start: "2025-02-28", end: "2025-02-28" } },
    error_message: "数据完整度不足：上传文件缺失交流电流(D5)和当日发电量(D9)字段，无法执行诊断",
    created_at: "2025-02-28T11:00:00Z",
    files: [{ id: "f-401", name: "INV_20250228.csv", size: 580000, rowCount: 288, timeStart: "2025-02-28T00:00:00Z", timeEnd: "2025-02-28T23:55:00Z", encoding: "GBK" }],
    mappingsCount: 14,
  },
};

interface MockFile {
  id: string; name: string; size: number; rowCount: number;
  timeStart: string; timeEnd: string; encoding: string;
}

interface MockLoss {
  key: string; label: string; lossRate: number; lossKwh: number; diagnosed: boolean;
}

/** 模拟分析进度：30秒完成 80%，后 20% 长时间等待 */
function useSimulatedProgress(taskId: string, status: Task["status"]) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");

  useEffect(() => {
    if (status !== "analyzing") return;

    const steps = [
      { at: 0, text: "数据质量检查中..." },
      { at: 15, text: "GTI 辐照度换面计算(Hay&Davies)..." },
      { at: 30, text: "PR 计算与基准对比..." },
      { at: 45, text: "14 项损失管线运行中..." },
      { at: 65, text: "故障事件识别(5min帧扫描)..." },
      { at: 80, text: "报告数据聚合与格式化..." },
      { at: 92, text: "损失优化建议生成中..." },
    ];

    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) return p;
        return p + Math.random() * 8 + 1;
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [status]);

  // 根据进度确定当前步骤文本
  useEffect(() => {
    const steps = [
      { at: 0, text: "数据质量检查中..." },
      { at: 15, text: "GTI 辐照度换面计算(Hay&Davies)..." },
      { at: 30, text: "PR 计算与基准对比..." },
      { at: 45, text: "14 项损失管线运行中..." },
      { at: 65, text: "故障事件识别(5min帧扫描)..." },
      { at: 80, text: "报告数据聚合与格式化..." },
      { at: 92, text: "损失优化建议生成中..." },
    ];
    const s = [...steps].reverse().find((s) => progress >= s.at);
    if (s) setCurrentStep(s.text);
  }, [progress]);

  return { progress: Math.min(progress, 99), currentStep };
}

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const task = MOCK_TASKS[params.id];

  // 分析进度（仅 analyzing 状态）
  const { progress, currentStep } = useSimulatedProgress(params.id, task?.status ?? "pending");

  // 用户反馈状态（仅已完成）
  const [feedback, setFeedback] = useState<"none" | "confirmed" | "doubtful">("none");

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <ClipboardList className="h-12 w-12 text-zinc-300" />
        <h3 className="mt-4 text-sm font-medium text-zinc-500">任务不存在</h3>
        <p className="mt-1 text-xs text-zinc-400">该任务可能已被删除或 ID 无效</p>
        <Link href="/tasks" className="mt-4">
          <Button variant="outline" size="sm">返回任务列表</Button>
        </Link>
      </div>
    );
  }

  const statusCfg = TASK_STATUS_CONFIG[task.status];
  const StatusIcon = statusCfg.icon;

  // 格式化文件大小
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 计算预计剩余时间
  const estimatedRemaining = progress > 0 ? Math.round((100 - progress) / 3) : null;

  return (
    <div className="space-y-6">
      {/* ── 页头 ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/tasks">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                {task.stationName}
              </h1>
              <Badge className={cn("text-[10px]", statusCfg.color, statusCfg.bgColor)}>
                <StatusIcon className="mr-1 h-3 w-3" />
                {statusCfg.label}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-zinc-400">
              诊断任务 · {task.id}
              {task.report_number && <span className="ml-2 font-mono text-[10px]">{task.report_number}</span>}
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {task.status === "completed" && (
            <>
              <Link href={`/reports/${task.id}`}>
                <Button size="sm">
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  查看报告
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  导出
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem>导出 PDF</DropdownMenuItem>
                  <DropdownMenuItem>导出 Excel</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                重新测算
              </Button>
            </>
          )}
          {task.status === "pending" && (
            <Link href={`/diagnose/mapping?task_id=${task.id}`}>
              <Button size="sm">
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                继续映射
              </Button>
            </Link>
          )}
          {task.status === "failed" && (
            <Link href={`/diagnose/mapping?task_id=${task.id}&retry=1`}>
              <Button size="sm">
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                修正重试
              </Button>
            </Link>
          )}
          {task.status === "analyzing" && (
            <Button size="sm" disabled>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              分析中...
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-500">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── 左侧：任务详情 ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* ── 分析中：进度卡片 ── */}
          {task.status === "analyzing" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  诊断进度
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 进度条 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-zinc-500">{currentStep}</span>
                    <span className="text-xs font-medium text-zinc-700">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                {/* 步骤列表 */}
                <div className="space-y-2">
                  {[
                    { label: "数据质量检查", icon: CheckCircle2, doneAt: 15 },
                    { label: "GTI换面计算", icon: CheckCircle2, doneAt: 30 },
                    { label: "PR计算与基准对比", icon: CheckCircle2, doneAt: 45 },
                    { label: "14项损失管线", icon: Loader2, doneAt: 65 },
                    { label: "故障事件识别", icon: Clock, doneAt: 80 },
                    { label: "报告数据生成", icon: Clock, doneAt: 95 },
                  ].map((step) => {
                    const done = progress >= step.doneAt;
                    const active = !done && progress >= step.doneAt - 20;
                    const StepIcon = active ? Loader2 : done ? CheckCircle2 : Clock;
                    return (
                      <div key={step.label} className="flex items-center gap-2">
                        <StepIcon
                          className={cn(
                            "h-3.5 w-3.5",
                            done ? "text-green-500" : active ? "text-blue-500 animate-spin" : "text-zinc-300"
                          )}
                        />
                        <span className={cn("text-xs", done ? "text-zinc-700" : active ? "text-blue-600 font-medium" : "text-zinc-400")}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {estimatedRemaining && (
                  <p className="text-xs text-zinc-400">
                    预计还需约 {estimatedRemaining} 秒 (总耗时通常 ≤60秒, PRD §5.1.5)
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── 诊断范围 ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-zinc-500" />
                诊断范围
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <InfoItem label="所属电站" value={task.stationName} />
                <InfoItem label="诊断子场站" value={`${task.scope.sub_station_ids.length} 个`} />
                <InfoItem label="数据起始" value={task.scope.date_range.start} />
                <InfoItem label="数据截止" value={task.scope.date_range.end} />
              </div>
            </CardContent>
          </Card>

          {/* ── 数据文件 ── */}
          {task.files && task.files.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-zinc-500" />
                  数据文件 ({task.files.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {task.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                      <FileSpreadsheet className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-zinc-800">{file.name}</span>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-zinc-400">
                        <span>{formatSize(file.size)}</span>
                        <span>{file.rowCount.toLocaleString()} 行</span>
                        <span>{file.timeStart.split("T")[0]} ~ {file.timeEnd.split("T")[0]}</span>
                        <span>编码: {file.encoding}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ── 失败原因 ── */}
          {task.status === "failed" && task.error_message && (
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  失败原因
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-600">{task.error_message}</p>
                <p className="mt-2 text-xs text-red-400">
                  请修正数据文件后重试。已完成的字段映射将保留，无需重新映射 (PRD §4.3)
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── 右侧：摘要面板 ── */}
        <div className="space-y-6">
          {/* 时间信息 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">时间信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs">
                <Calendar className="h-3 w-3 text-zinc-400" />
                <span className="text-zinc-500">创建时间</span>
              </div>
              <p className="text-sm font-medium text-zinc-800 ml-5">
                {new Date(task.created_at).toLocaleDateString("zh-CN", {
                  year: "numeric", month: "2-digit", day: "2-digit",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
              {task.completed_at && (
                <>
                  <div className="flex items-center gap-1.5 text-xs mt-3">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span className="text-zinc-500">完成时间</span>
                  </div>
                  <p className="text-sm font-medium text-zinc-800 ml-5">
                    {new Date(task.completed_at).toLocaleDateString("zh-CN", {
                      year: "numeric", month: "2-digit", day: "2-digit",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* 已完成 → 摘要指标 */}
          {task.status === "completed" && task.summary && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">诊断摘要</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <MiniMetric
                  label="实际 PR"
                  value={`${task.summary.pr_actual.toFixed(2)}%`}
                />
                <MiniMetric
                  label="PR 偏差"
                  value={`${task.summary.pr_deviation > 0 ? "+" : ""}${task.summary.pr_deviation.toFixed(2)}%`}
                  highlight={task.summary.pr_deviation > 0 ? "positive" : "negative"}
                />
                <Separator />
                <MiniMetric label="等效小时" value={`${task.equivalentHours ?? "--"} h`} />
                <MiniMetric
                  label="电量偏差"
                  value={`${task.summary.energy_deviation_kwh > 0 ? "+" : ""}${(task.summary.energy_deviation_kwh / 10000).toFixed(1)} 万kWh`}
                  highlight={task.summary.energy_deviation_kwh > 0 ? "positive" : "negative"}
                />
                <MiniMetric
                  label="收益偏差"
                  value={`${task.summary.revenue_deviation > 0 ? "+" : ""}¥${task.summary.revenue_deviation.toLocaleString()}`}
                  highlight={task.summary.revenue_deviation > 0 ? "positive" : "negative"}
                />
              </CardContent>
            </Card>
          )}

          {/* 损失概览（仅已完成） */}
          {task.status === "completed" && task.losses && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">主要损失</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {task.losses.map((loss) => (
                  <div key={loss.key} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {loss.diagnosed && (
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                      )}
                      <span className="text-zinc-600">{loss.label}</span>
                    </div>
                    <span className="font-medium text-zinc-800 tabular-nums">
                      -{loss.lossRate.toFixed(2)}% · {loss.lossKwh.toLocaleString()} kWh
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 用户反馈（仅已完成）PRD §4.2.2 */}
          {task.status === "completed" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">诊断反馈</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Button
                    variant={feedback === "confirmed" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setFeedback(feedback === "confirmed" ? "none" : "confirmed")}
                  >
                    <ThumbsUp className="mr-1 h-3 w-3" />
                    确认
                  </Button>
                  <Button
                    variant={feedback === "doubtful" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setFeedback(feedback === "doubtful" ? "none" : "doubtful")}
                  >
                    <ThumbsDown className="mr-1 h-3 w-3" />
                    存疑
                  </Button>
                </div>
                <p className="mt-2 text-[11px] text-zinc-400">
                  反馈将用于模型持续优化 (PRD §5.4)
                </p>
              </CardContent>
            </Card>
          )}

          {/* 操作区 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">更多操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {task.status === "completed" && (
                <>
                  <Link href={`/stations/${task.station_id}`} className="block">
                    <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                      <Building2 className="mr-2 h-3.5 w-3.5" />
                      查看电站详情
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                    <BarChart3 className="mr-2 h-3.5 w-3.5" />
                    对比历史任务
                  </Button>
                </>
              )}
              {task.status === "analyzing" && (
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-amber-600">
                  <XCircle className="mr-2 h-3.5 w-3.5" />
                  取消诊断
                </Button>
              )}
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-red-500">
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                删除任务
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** 信息条目 */
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-zinc-400">{label}</p>
      <p className="text-sm font-medium text-zinc-800">{value}</p>
    </div>
  );
}

/** 迷你指标 */
function MiniMetric({ label, value, highlight }: { label: string; value: string; highlight?: "positive" | "negative" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          highlight === "positive" ? "text-green-600" : highlight === "negative" ? "text-red-600" : "text-zinc-800"
        )}
      >
        {value}
      </span>
    </div>
  );
}
