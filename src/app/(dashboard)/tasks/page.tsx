"use client";

/**
 * 诊断任务列表页
 *
 * 展示用户所有诊断任务，支持按电站/sttatus/时间筛选。
 * PRD §4.2 任务实体：每个任务归属于某个电站，有完整的生命周期状态。
 *
 * 功能：
 *   - 按状态筛选（待映射 / 分析中 / 已完成 / 已失败）
 *   - 按所属电站筛选
 *   - 按时间排序
 *   - 点击任务卡片 → 跳转到报告页或任务详情
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Search,
  Filter,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Zap,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/diagnosis";

// ── 任务状态配置 ──
const TASK_STATUS_CONFIG: Record<Task["status"], { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  pending: { icon: Clock, label: "待映射", color: "text-zinc-500 bg-zinc-100" },
  analyzing: { icon: Loader2, label: "分析中", color: "text-blue-600 bg-blue-50" },
  completed: { icon: CheckCircle2, label: "已完成", color: "text-green-600 bg-green-50" },
  failed: { icon: XCircle, label: "已失败", color: "text-red-600 bg-red-50" },
};

// ── 模拟数据 ──
const MOCK_TASKS: (Task & { stationName?: string; pr?: number; issues?: number; equivalentHours?: number })[] = [
  {
    id: "task-006", station_id: "st-001", owner_id: "user-1",
    status: "pending", stationName: "西郊分布式光伏电站",
    scope: { sub_station_ids: ["sub-001"], date_range: { start: "2025-04-01", end: "2025-04-15" } },
    created_at: "2025-04-01T09:00:00Z",
  },
  {
    id: "task-005", station_id: "st-001", owner_id: "user-1",
    status: "analyzing", stationName: "西郊分布式光伏电站",
    scope: { sub_station_ids: ["sub-001", "sub-002", "sub-003"], date_range: { start: "2025-03-15", end: "2025-03-31" } },
    created_at: "2025-03-31T08:30:00Z",
  },
  {
    id: "task-004", station_id: "st-001", owner_id: "user-1",
    status: "completed", stationName: "西郊分布式光伏电站",
    scope: { sub_station_ids: ["sub-001", "sub-002", "sub-003"], date_range: { start: "2025-03-01", end: "2025-03-15" } },
    summary: { pr_actual: 85.2, pr_baseline: 73.38, pr_deviation: 11.82, energy_actual_kwh: 102300, energy_baseline_kwh: 88100, energy_deviation_kwh: 14200, revenue_actual: 39999, revenue_baseline: 34445, revenue_deviation: 5554 },
    report_number: "PVAI20250315103000001",
    created_at: "2025-03-15T10:30:00Z", completed_at: "2025-03-15T10:32:00Z",
    pr: 85.2, issues: 1, equivalentHours: 92,
  },
  {
    id: "task-003", station_id: "st-002", owner_id: "user-1",
    status: "completed", stationName: "东部开发区屋顶光伏",
    scope: { sub_station_ids: ["sub-004"], date_range: { start: "2025-03-01", end: "2025-03-10" } },
    summary: { pr_actual: 79.5, pr_baseline: 72.1, pr_deviation: 7.4, energy_actual_kwh: 85000, energy_baseline_kwh: 77100, energy_deviation_kwh: 7900, revenue_actual: 33235, revenue_baseline: 30146, revenue_deviation: 3089 },
    report_number: "PVAI20250310150000002",
    created_at: "2025-03-10T15:00:00Z", completed_at: "2025-03-10T15:01:30Z",
    pr: 79.5, issues: 3, equivalentHours: 78,
  },
  {
    id: "task-002", station_id: "st-001", owner_id: "user-1",
    status: "failed", stationName: "西郊分布式光伏电站",
    scope: { sub_station_ids: ["sub-001"], date_range: { start: "2025-02-28", end: "2025-02-28" } },
    error_message: "数据完整度不足：上传文件缺失交流电流(D5)和当日发电量(D9)字段，无法执行诊断",
    created_at: "2025-02-28T11:00:00Z",
  },
];

export default function TasksPage() {
  const [tasks] = useState(MOCK_TASKS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Task["status"] | "all">("all");
  const [stationFilter, setStationFilter] = useState<string>("all");

  // ── 获取电站列表供筛选 ──
  const stations = useMemo(
    () => [...new Map(tasks.map((t) => [t.station_id, { id: t.station_id, name: t.stationName }])).values()],
    [tasks]
  );

  // ── 筛选 + 排序 ──
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.stationName?.toLowerCase().includes(q) ||
          t.report_number?.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (stationFilter !== "all") {
      result = result.filter((t) => t.station_id === stationFilter);
    }

    // 按创建时间倒序
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return result;
  }, [tasks, searchQuery, statusFilter, stationFilter]);

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">诊断任务</h1>
          <p className="mt-1 text-sm text-zinc-500">
            跟踪所有诊断任务的状态与进度
          </p>
        </div>
        <Link href="/diagnose/upload">
          <Button size="sm">
            <Zap className="mr-2 h-4 w-4" />
            新建诊断
          </Button>
        </Link>
      </div>

      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="搜索电站名称 / 报告编号..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v ?? "all") as Task["status"] | "all")}>
          <SelectTrigger className="w-32">
            <Filter className="mr-2 h-3.5 w-3.5" />
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {Object.entries(TASK_STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stationFilter} onValueChange={(v) => setStationFilter(v ?? "all")}>
          <SelectTrigger className="w-44">
            <Building2 className="mr-2 h-3.5 w-3.5" />
            <SelectValue placeholder="全部电站" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部电站</SelectItem>
            {stations.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 任务列表 */}
      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ClipboardList className="h-12 w-12 text-zinc-300" />
          <h3 className="mt-4 text-sm font-medium text-zinc-500">没有找到匹配的任务</h3>
          <p className="mt-1 text-xs text-zinc-400">尝试调整筛选条件，或新建一个诊断任务</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const statusCfg = TASK_STATUS_CONFIG[task.status];
            const StatusIcon = statusCfg.icon;
            return (
              <Card
                key={task.id}
                className={cn(
                  "transition-shadow hover:shadow-sm",
                  task.status === "failed" && "opacity-70"
                )}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  {/* 状态图标 */}
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      task.status === "completed" && "bg-green-100 text-green-600",
                      task.status === "analyzing" && "bg-blue-100 text-blue-600",
                      task.status === "pending" && "bg-zinc-100 text-zinc-500",
                      task.status === "failed" && "bg-red-100 text-red-600"
                    )}
                  >
                    <StatusIcon
                      className={cn("h-5 w-5", task.status === "analyzing" && "animate-spin")}
                    />
                  </div>

                  {/* 任务信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={
                          task.status === "completed"
                            ? `/reports/${task.id}`
                            : `/tasks/${task.id}`
                        }
                        className="text-sm font-semibold text-zinc-900 hover:text-zinc-600 transition-colors truncate"
                      >
                        {task.stationName} — 诊断任务
                      </Link>
                      <Badge className={cn("text-[10px]", statusCfg.color)}>
                        {statusCfg.label}
                      </Badge>
                      {task.report_number && (
                        <span className="text-[10px] text-zinc-400 font-mono ml-auto">
                          {task.report_number}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">
                      {new Date(task.created_at).toLocaleDateString("zh-CN", {
                        year: "numeric", month: "2-digit", day: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}
                      {task.scope?.date_range && (
                        <span>
                          {" · "}数据：{task.scope.date_range.start} ~ {task.scope.date_range.end}
                        </span>
                      )}
                    </p>
                    {/* 失败原因 */}
                    {task.status === "failed" && task.error_message && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {task.error_message}
                      </p>
                    )}
                  </div>

                  {/* 摘要指标（仅已完成任务） */}
                  {task.status === "completed" && task.summary && (
                    <div className="hidden items-center gap-5 md:flex">
                      <MiniMetric label="PR" value={`${task.pr?.toFixed(1)}%`} />
                      <MiniMetric label="等效小时" value={`${task.equivalentHours}h`} />
                      <MiniMetric
                        label="问题"
                        value={`${task.issues ?? 0}项`}
                        highlight={!!(task.issues && task.issues > 0)}
                      />
                    </div>
                  )}

                  {/* 操作 */}
                  <div className="flex items-center gap-1.5">
                    {task.status === "completed" ? (
                      <>
                        <Link href={`/reports/${task.id}`}>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <FileText className="mr-1 h-3 w-3" />
                            查看报告
                          </Button>
                        </Link>
                      </>
                    ) : task.status === "pending" ? (
                      <Link href={`/diagnose/mapping?task_id=${task.id}`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                          继续映射
                        </Button>
                      </Link>
                    ) : task.status === "failed" ? (
                      <Link href={`/diagnose/mapping?task_id=${task.id}&retry=1`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                          修正重试
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="outline" size="sm" className="h-8 text-xs" disabled>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        分析中...
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** 迷你指标展示 */
function MiniMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-right">
      <p className="text-[10px] text-zinc-400">{label}</p>
      <p className={cn("text-sm font-semibold", highlight ? "text-amber-600" : "text-zinc-900")}>
        {value}
      </p>
    </div>
  );
}
