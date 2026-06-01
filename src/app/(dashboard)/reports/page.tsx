"use client";

/**
 * 报告中心页
 *
 * 展示所有已完成诊断任务的报告列表，是产品价值交付的入口。
 * PRD §5.3 诊断报告输出：报告是产品价值的最终交付物。
 *
 * 功能：
 *   - 按电站筛选报告
 *   - 按时间排序（默认最新在前）
 *   - 报告摘要预览（PR、偏差、问题数）
 *   - 支持导出操作（PDF/Excel，PRD §5.3.0 双模态设计）
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  ExternalLink,
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTasks, useStations } from "@/lib/data-hooks";
import { exportExcel, exportJSON } from "@/lib/export-utils";
import type { Station, Task } from "@/types/diagnosis";
import type { MockTask } from "@/lib/mock-data";

export default function ReportsPage() {
  const { data: tasks, isLoading, isError } = useTasks();
  const { data: stations } = useStations();
  const [searchQuery, setSearchQuery] = useState("");
  const [stationFilter, setStationFilter] = useState<string>("all");

  // 仅展示已完成任务（即为报告）
  type CompletedMockTask = MockTask & { summary: NonNullable<MockTask["summary"]> };
  const reports = useMemo(() => {
    const all = (tasks as MockTask[] | undefined) ?? [];
    return all.filter((t) => t.status === "completed" && t.summary) as CompletedMockTask[];
  }, [tasks]);

  // 筛选 + 排序
  const filteredReports = useMemo(() => {
    let result = [...reports];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.stationName?.toLowerCase().includes(q) ||
          r.report_number?.toLowerCase().includes(q)
      );
    }

    if (stationFilter !== "all") {
      result = result.filter((r) => r.station_id === stationFilter);
    }

    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return result;
  }, [reports, searchQuery, stationFilter]);

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">报告中心</h1>
          <p className="mt-1 text-sm text-zinc-500">
            查看和导出电站健康诊断报告（PRD §5.3）
          </p>
        </div>
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
        <Select value={stationFilter} onValueChange={(v) => setStationFilter(v ?? "all")}>
          <SelectTrigger className="w-44">
            <Building2 className="mr-2 h-3.5 w-3.5" />
            <SelectValue placeholder="全部电站" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部电站</SelectItem>
            {(stations ?? []).map((s: Station) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 报告列表 */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Loader2 className="h-12 w-12 text-zinc-300 animate-spin" />
          <h3 className="mt-4 text-sm font-medium text-zinc-500">加载中...</h3>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FileText className="h-12 w-12 text-zinc-300" />
          <h3 className="mt-4 text-sm font-medium text-zinc-500">加载失败</h3>
          <p className="mt-1 text-xs text-zinc-400">请检查网络连接后刷新重试</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FileText className="h-12 w-12 text-zinc-300" />
          <h3 className="mt-4 text-sm font-medium text-zinc-500">暂无报告</h3>
          <p className="mt-1 text-xs text-zinc-400">完成第一次诊断后，报告将显示在这里</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => {
            const deviationIsPositive = report.summary.pr_deviation > 0;
            const DeviationIcon = deviationIsPositive ? TrendingUp : report.summary.pr_deviation < 0 ? TrendingDown : Minus;

            return (
              <Card key={report.id} className="transition-shadow hover:shadow-sm">
                <CardContent className="flex items-center gap-5 p-5">
                  {/* PR偏差大数字 */}
                  <div className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-zinc-50 px-5 py-3 min-w-28">
                    <span
                      className={cn(
                        "text-2xl font-bold tabular-nums",
                        deviationIsPositive ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {report.summary.pr_deviation > 0 ? "+" : ""}
                      {report.summary.pr_deviation.toFixed(2)}%
                    </span>
                    <span className="text-[11px] text-zinc-400 mt-0.5">PR 偏差</span>
                  </div>

                  {/* 报告信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/reports/${report.id}`}
                        className="text-base font-semibold text-zinc-900 hover:text-zinc-600 transition-colors"
                      >
                        {report.stationName ?? report.station_id}
                      </Link>
                      <Badge variant="secondary" className="text-[10px]">诊断报告</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(report.created_at).toLocaleDateString("zh-CN", {
                          year: "numeric", month: "2-digit", day: "2-digit",
                        })}
                      </span>
                      <span>
                        数据：{report.scope.date_range.start} ~ {report.scope.date_range.end}
                      </span>
                      <span>{report.scope.sub_station_ids.length} 个子场站</span>
                      <span className="font-mono text-[10px]">{report.report_number}</span>
                    </div>
                    {/* 关键指标行 */}
                    <div className="mt-3 grid grid-cols-3 gap-4 md:grid-cols-5">
                      <MiniMetric label="实际 PR" value={`${report.summary.pr_actual.toFixed(2)}%`} />
                      <MiniMetric label="基准 PR" value={`${report.summary.pr_baseline.toFixed(2)}%`} />
                      <MiniMetric
                        label="电量偏差"
                        value={`${report.summary.energy_deviation_kwh > 0 ? "+" : ""}${(report.summary.energy_deviation_kwh / 10000).toFixed(1)} 万kWh`}
                        positive={report.summary.energy_deviation_kwh > 0}
                      />
                      <MiniMetric
                        label="收益偏差"
                        value={`${report.summary.revenue_deviation > 0 ? "+" : ""}¥${report.summary.revenue_deviation.toLocaleString()}`}
                        positive={report.summary.revenue_deviation > 0}
                      />
                      <MiniMetric
                        label="发现问题"
                        value={`${(report.issues ?? 0)} 项`}
                        positive={(report.issues ?? 0) === 0}
                      />
                    </div>
                  </div>

                  {/* 操作区 */}
                  <div className="flex shrink-0 flex-col gap-2">
                    <Link href={`/reports/${report.id}`}>
                      <Button size="sm" className="w-full">
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        查看报告
                      </Button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        导出
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem
                          onClick={() => { toast.success("正在生成 PDF..."); window.print(); }}
                        >
                          导出 PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            toast.success("正在导出 Excel...");
                            exportExcel(report.report_number ?? report.id, {
                              "核心指标": [
                                { 指标: "实际PR", 数值: `${report.summary.pr_actual.toFixed(2)}%` },
                                { 指标: "基准PR", 数值: `${report.summary.pr_baseline.toFixed(2)}%` },
                                { 指标: "PR偏差", 数值: `${report.summary.pr_deviation > 0 ? "+" : ""}${report.summary.pr_deviation.toFixed(2)}%` },
                                { 指标: "电量偏差", 数值: `${(report.summary.energy_deviation_kwh / 10000).toFixed(1)} 万kWh` },
                                { 指标: "收益偏差", 数值: `¥${report.summary.revenue_deviation.toLocaleString()}` },
                              ],
                            });
                          }}
                        >
                          导出 Excel
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            toast.success("正在下载原始数据...");
                            exportJSON(report, `${report.report_number ?? report.id}_raw`);
                          }}
                        >
                          下载原始数据
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

/** 迷你指标 */
function MiniMetric({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-zinc-400">{label}</p>
      <p
        className={cn(
          "text-sm font-semibold tabular-nums",
          positive === undefined ? "text-zinc-700" : positive ? "text-green-600" : "text-red-600"
        )}
      >
        {value}
      </p>
    </div>
  );
}
