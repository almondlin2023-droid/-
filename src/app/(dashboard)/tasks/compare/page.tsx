"use client";

/**
 * 诊断任务对比页
 *
 * 选择同一电站下的 2-3 个历史任务，并排对比核心指标变化。
 * PRD §4.2.3 任务操作-对比：指标变化、故障是否修复、PR趋势。
 *
 * 功能：
 *   - 任务选择器（同站内勾选 2-3 个）
 *   - PR 趋势迷你图 + 偏差对比
 *   - 损失瀑布图并排对比
 *   - 故障事件对比（新增/已修复/持续存在）
 *   - 关键指标变化表
 */

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  FileText,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ── 模拟对比用任务数据 ──
interface CompareTask {
  id: string;
  stationId: string;
  stationName: string;
  reportNumber: string;
  createdAt: string;
  dataRange: { start: string; end: string };
  summary: {
    pr_actual: number; pr_baseline: number; pr_deviation: number;
    energy_actual_kwh: number; energy_baseline_kwh: number; energy_deviation_kwh: number;
    revenue_actual: number; revenue_baseline: number; revenue_deviation: number;
  };
  issues: { type: string; label: string; resolved: boolean; severity: "high" | "medium" }[];
  losses: { key: string; label: string; lossRate: number; lossKwh: number; isFault: boolean }[];
}

const MOCK_COMPARE_TASKS: CompareTask[] = [
  {
    id: "task-001", stationId: "st-001", stationName: "西郊分布式光伏电站",
    reportNumber: "PVAI20250105160000001",
    createdAt: "2025-01-05T16:00:00Z",
    dataRange: { start: "2025-01-01", end: "2025-01-05" },
    summary: {
      pr_actual: 78.4, pr_baseline: 66.0, pr_deviation: 12.4,
      energy_actual_kwh: 92000, energy_baseline_kwh: 77500, energy_deviation_kwh: 14500,
      revenue_actual: 35972, revenue_baseline: 30303, revenue_deviation: 5669,
    },
    issues: [
      { type: "string_outage", label: "掉串", resolved: false, severity: "high" },
      { type: "shadow", label: "阴影遮挡", resolved: false, severity: "medium" },
      { type: "clipping", label: "限额", resolved: false, severity: "medium" },
      { type: "soiling", label: "灰尘", resolved: false, severity: "medium" },
      { type: "offline", label: "离线", resolved: false, severity: "high" },
    ],
    losses: [
      { key: "installation", label: "安装条件", lossRate: 2.5, lossKwh: 2300, isFault: false },
      { key: "shadow", label: "阴影", lossRate: 3.8, lossKwh: 3496, isFault: true },
      { key: "soiling", label: "灰尘", lossRate: 2.9, lossKwh: 2668, isFault: true },
      { key: "fault_string", label: "掉串", lossRate: 4.2, lossKwh: 3864, isFault: true },
      { key: "fault_clip", label: "限额", lossRate: 1.8, lossKwh: 1656, isFault: true },
    ],
  },
  {
    id: "task-004", stationId: "st-001", stationName: "西郊分布式光伏电站",
    reportNumber: "PVAI20250315103000001",
    createdAt: "2025-03-15T10:30:00Z",
    dataRange: { start: "2025-03-01", end: "2025-03-15" },
    summary: {
      pr_actual: 85.2, pr_baseline: 73.38, pr_deviation: 11.82,
      energy_actual_kwh: 102300, energy_baseline_kwh: 88100, energy_deviation_kwh: 14200,
      revenue_actual: 39999, revenue_baseline: 34445, revenue_deviation: 5554,
    },
    issues: [
      { type: "string_outage", label: "掉串", resolved: true, severity: "high" },
      { type: "shadow", label: "阴影遮挡", resolved: false, severity: "medium" },
      { type: "clipping", label: "限额", resolved: true, severity: "medium" },
      { type: "soiling", label: "灰尘", resolved: false, severity: "medium" },
      { type: "offline", label: "离线", resolved: true, severity: "high" },
    ],
    losses: [
      { key: "installation", label: "安装条件", lossRate: 2.4, lossKwh: 2458, isFault: false },
      { key: "shadow", label: "阴影", lossRate: 3.3, lossKwh: 3380, isFault: true },
      { key: "soiling", label: "灰尘", lossRate: 2.2, lossKwh: 2253, isFault: true },
      { key: "fault_string", label: "掉串", lossRate: 0.5, lossKwh: 512, isFault: true },
      { key: "fault_clip", label: "限额", lossRate: 0.3, lossKwh: 307, isFault: true },
    ],
  },
];

// ── 模拟电站列表（用于选择器） ──
const MOCK_STATIONS = [
  { id: "st-001", name: "西郊分布式光伏电站", taskCount: 5 },
  { id: "st-002", name: "东部开发区屋顶光伏", taskCount: 2 },
];

export default function ComparePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [stationId, setStationId] = useState<string>(searchParams.get("station_id") ?? "st-001");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    searchParams.get("task_ids")?.split(",") ?? ["task-001", "task-004"]
  );

  // 当前电站的可用对比任务
  const availableTasks = useMemo(
    () => MOCK_COMPARE_TASKS.filter((t) => t.stationId === stationId),
    [stationId]
  );

  // 已选中的任务对象
  const selectedTasks = useMemo(
    () => MOCK_COMPARE_TASKS.filter((t) => selectedIds.includes(t.id)),
    [selectedIds]
  );

  const toggleTask = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(taskId)) {
        if (prev.length <= 2) return prev; // 至少选2个
        return prev.filter((id) => id !== taskId);
      }
      if (prev.length >= 3) return prev; // 最多选3个
      return [...prev, taskId];
    });
  }, []);

  // ── 颜色方案：任务 → 颜色 ──
  const taskColors = ["#2563EB", "#F59E0B", "#10B981"]; // 蓝、橙、绿

  // ── 指标变化计算 ──
  const calcChange = (idx: number, field: keyof CompareTask["summary"]) => {
    if (idx === 0) return undefined;
    const curr = selectedTasks[idx].summary[field] as number;
    const prev = selectedTasks[idx - 1].summary[field] as number;
    return curr - prev;
  };

  // ── 故障状态对比逻辑 ──
  const issueComparison = useMemo(() => {
    if (selectedTasks.length < 2) return [];
    const allTypes = [...new Set(selectedTasks.flatMap((t) => t.issues.map((i) => i.type)))];
    return allTypes.map((type) => {
      const states = selectedTasks.map((t) => {
        const issue = t.issues.find((i) => i.type === type);
        return issue ? (issue.resolved ? "resolved" : "active") : "none";
      });
      const label = selectedTasks.find((t) => t.issues.find((i) => i.type === type))?.issues.find((i) => i.type === type)?.label ?? type;
      return { type, label, states };
    });
  }, [selectedTasks]);

  return (
    <div className="space-y-6">
      {/* ── 页头 ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/stations">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">任务对比</h1>
            <p className="mt-0.5 text-xs text-zinc-400">
              选择同一电站下 2-3 个历史任务并排对比 (PRD §4.2.3)
            </p>
          </div>
        </div>
      </div>

      {/* ── 选择器 ── */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-zinc-400" />
            <Select value={stationId} onValueChange={(v) => { setStationId(v ?? "st-001"); setSelectedIds([]); }}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder="选择电站" />
              </SelectTrigger>
              <SelectContent>
                {MOCK_STATIONS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <span className="text-xs text-zinc-500">选择要对比的任务 ({selectedIds.length}/3)：</span>
          <div className="flex flex-wrap gap-2">
            {availableTasks.map((task, i) => {
              const selected = selectedIds.includes(task.id);
              const colorIndex = selectedIds.indexOf(task.id);
              return (
                <button
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                    selected
                      ? "text-white shadow-sm"
                      : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  )}
                  style={selected ? { backgroundColor: taskColors[colorIndex] } : undefined}
                >
                  {selected && <CheckCircle2 className="h-3 w-3" />}
                  {new Date(task.createdAt).toLocaleDateString("zh-CN", {
                    month: "2-digit", day: "2-digit",
                  })}
                  {" · "}PR {task.summary.pr_actual.toFixed(1)}%
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedTasks.length < 2 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BarChart3 className="h-12 w-12 text-zinc-300" />
          <h3 className="mt-4 text-sm font-medium text-zinc-500">请至少选择 2 个任务</h3>
          <p className="mt-1 text-xs text-zinc-400">选择后下方将展示并排对比数据</p>
        </div>
      ) : (
        <>
          {/* ── 核心指标并排对比 ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-zinc-500" />
                核心指标对比
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <td className="py-2 font-medium text-zinc-500 w-28">指标</td>
                      {selectedTasks.map((task, i) => (
                        <td key={task.id} className="py-2 font-semibold text-center" style={{ color: taskColors[i] }}>
                          <Link href={`/reports/${task.id}`} className="hover:underline">
                            {new Date(task.createdAt).toLocaleDateString("zh-CN", {
                              year: "numeric", month: "2-digit", day: "2-digit",
                            })}
                          </Link>
                        </td>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {/* PR 实际 */}
                    <CompareRow
                      label="实际 PR"
                      values={selectedTasks.map((t) => `${t.summary.pr_actual.toFixed(2)}%`)}
                      colors={taskColors}
                    />
                    {/* PR 基准 */}
                    <CompareRow
                      label="基准 PR"
                      values={selectedTasks.map((t) => `${t.summary.pr_baseline.toFixed(2)}%`)}
                      colors={taskColors}
                    />
                    {/* PR 偏差 */}
                    <CompareRow
                      label="PR 偏差"
                      values={selectedTasks.map((t) => `${t.summary.pr_deviation > 0 ? "+" : ""}${t.summary.pr_deviation.toFixed(2)}%`)}
                      colors={taskColors}
                      valueBold
                      valueColor={(v) => v.startsWith("+") ? "text-green-600" : "text-red-600"}
                    />
                    {/* 电量 */}
                    <CompareRow
                      label="实际发电量"
                      values={selectedTasks.map((t) => `${(t.summary.energy_actual_kwh / 10000).toFixed(1)} 万kWh`)}
                      colors={taskColors}
                    />
                    {/* 收益 */}
                    <CompareRow
                      label="实际收益"
                      values={selectedTasks.map((t) => `¥${t.summary.revenue_actual.toLocaleString()}`)}
                      colors={taskColors}
                    />
                    <CompareRow
                      label="数据范围"
                      values={selectedTasks.map((t) => `${t.dataRange.start} ~ ${t.dataRange.end}`)}
                      colors={taskColors}
                    />
                  </tbody>
                </table>
              </div>

              {/* PR 趋势条 */}
              <div className="mt-6">
                <p className="text-[11px] text-zinc-400 mb-2">PR 趋势</p>
                <div className="flex items-end gap-2 h-20">
                  {selectedTasks.map((task, i) => {
                    const maxPr = Math.max(...selectedTasks.map((t) => t.summary.pr_actual));
                    const height = (task.summary.pr_actual / maxPr) * 100;
                    return (
                      <div key={task.id} className="flex flex-col items-center gap-1 flex-1">
                        <span className="text-xs font-semibold tabular-nums" style={{ color: taskColors[i] }}>
                          {task.summary.pr_actual.toFixed(1)}%
                        </span>
                        <div
                          className="w-full rounded-t-sm transition-all duration-500"
                          style={{ height: `${height}%`, backgroundColor: taskColors[i], opacity: 0.7 }}
                        />
                        <span className="text-[10px] text-zinc-400">
                          {new Date(task.createdAt).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── 损失分解并排对比 ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-zinc-500" />
                损失分解对比
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <td className="py-2 font-medium text-zinc-500 w-28">损失项</td>
                      {selectedTasks.map((task, i) => (
                        <td key={task.id} className="py-2 font-semibold text-center" style={{ color: taskColors[i] }}>
                          {new Date(task.createdAt).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })}
                        </td>
                      ))}
                      {selectedTasks.length === 2 && (
                        <td className="py-2 font-medium text-zinc-500 text-center w-20">变化</td>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {/* 收集所有损失 key */}
                    {(() => {
                      const allKeys = [...new Set(selectedTasks.flatMap((t) => t.losses.map((l) => l.key)))];
                      const allLabels = selectedTasks.flatMap((t) => t.losses);
                      return allKeys.map((key) => {
                        const label = allLabels.find((l) => l.key === key)?.label ?? key;
                        const values = selectedTasks.map((t) => {
                          const loss = t.losses.find((l) => l.key === key);
                          return loss ? `${loss.lossRate.toFixed(2)}%` : "--";
                        });
                        const last = selectedTasks.length === 2 && values[0] !== "--" && values[1] !== "--"
                          ? (parseFloat(values[1]) - parseFloat(values[0])).toFixed(2)
                          : null;
                        return (
                          <CompareRow
                            key={key}
                            label={label}
                            values={values}
                            colors={taskColors}
                            change={last ? `${parseFloat(last) > 0 ? "+" : ""}${last}%` : undefined}
                            changeColor={last ? (parseFloat(last) < 0 ? "text-green-600" : parseFloat(last) > 0 ? "text-red-600" : "text-zinc-400") : undefined}
                          />
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ── 故障事件对比 ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-zinc-500" />
                故障事件变化
              </CardTitle>
            </CardHeader>
            <CardContent>
              {issueComparison.length === 0 ? (
                <p className="text-xs text-zinc-400">所选任务未发现问题</p>
              ) : (
                <div className="space-y-2">
                  {issueComparison.map((issue) => {
                    // 判断趋势：新出现 / 已修复 / 持续
                    const first = issue.states[0];
                    const last = issue.states[issue.states.length - 1];
                    let trendLabel = "";
                    let trendColor = "";
                    if (first === "none" && last === "active") { trendLabel = "新发现"; trendColor = "text-red-600 bg-red-50"; }
                    else if (first === "active" && last === "resolved") { trendLabel = "已修复"; trendColor = "text-green-600 bg-green-50"; }
                    else if (first === "active" && last === "active") { trendLabel = "持续"; trendColor = "text-amber-600 bg-amber-50"; }
                    else if (last === "none") { trendLabel = "已消失"; trendColor = "text-zinc-500 bg-zinc-100"; }

                    return (
                      <div key={issue.type} className="flex items-center gap-3 rounded-lg border border-zinc-100 px-3 py-2">
                        <span className="text-xs font-medium text-zinc-700 w-20">{issue.label}</span>
                        <div className="flex items-center gap-1 flex-1">
                          {issue.states.map((state, i) => (
                            <div key={i} className="flex items-center gap-1">
                              {state === "active" && <XCircle className="h-3.5 w-3.5 text-red-500" />}
                              {state === "resolved" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                              {state === "none" && <Minus className="h-3.5 w-3.5 text-zinc-300" />}
                              {i < issue.states.length - 1 && (
                                <span className="text-zinc-300 mx-1">→</span>
                              )}
                            </div>
                          ))}
                        </div>
                        {trendLabel && (
                          <Badge className={cn("text-[10px]", trendColor)}>{trendLabel}</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── 操作 ── */}
          <div className="flex items-center justify-end gap-2">
            {selectedTasks.map((task, i) => (
              <Link key={task.id} href={`/reports/${task.id}`}>
                <Button variant="outline" size="sm" className="text-xs">
                  <FileText className="mr-1.5 h-3 w-3" />
                  查看报告 ({new Date(task.createdAt).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })})
                </Button>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** 对比表行 */
function CompareRow({
  label, values, colors, valueBold, valueColor, change, changeColor,
}: {
  label: string;
  values: string[];
  colors: string[];
  valueBold?: boolean;
  valueColor?: (v: string) => string;
  change?: string;
  changeColor?: string;
}) {
  return (
    <tr className="hover:bg-zinc-50/50 transition-colors">
      <td className="py-2.5 text-zinc-500">{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className={cn(
            "py-2.5 text-center tabular-nums",
            valueBold ? "font-semibold" : "font-medium",
            valueColor ? valueColor(v) : "text-zinc-800"
          )}
          style={{ color: !valueColor ? colors[i] : undefined }}
        >
          {v}
        </td>
      ))}
      {change !== undefined && (
        <td className={cn("py-2.5 text-center font-semibold tabular-nums", changeColor)}>
          {change}
        </td>
      )}
    </tr>
  );
}
