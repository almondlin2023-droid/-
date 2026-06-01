"use client";

/**
 * 电站详情页
 *
 * PRD §4.5 定义：展示电站全部配置参数、子场站列表、历史任务时间线。
 * 分为两个区域：
 *   上半部分：电站级参数 + 子场站卡片列表
 *   下半部分：历史诊断任务时间线（按时间倒序排列）
 *
 * 交互能力：
 *   - 编辑电站 → 跳转到编辑页
 *   - 新建诊断 → 跳转到诊断上传流程
 *   - 查看报告 → 跳转到具体任务报告页
 *   - 对比任务 → 选择 2-3 个历史任务并排对比
 */

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Cpu,
  Edit3,
  FileText,
  MapPin,
  Plus,
  Sun,
  Zap,
  TrendingUp,
  Download,
  GitCompare,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  BarChart3,
  Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Station3DCanvas, type SubStation3D } from "@/components/station-3d";
import type { Station, SubStation, Task, TaskSummary } from "@/types/diagnosis";

// ── 开发阶段模拟数据 ──
const MOCK_STATION: Station = {
  id: "st-001",
  owner_id: "user-1",
  name: "西郊分布式光伏电站",
  longitude: 120.1234,
  latitude: 31.5678,
  timezone: "Asia/Shanghai",
  resource_zone: "III",
  grid_conn_date: "2023-06-15",
  grid_voltage: 10,
  feed_in_price: 0.391,
  module_type: "单晶",
  module_model: "LR5-72HPH-545M",
  module_power: 545,
  temp_coeff: -0.0035,
  status: "active",
  created_at: "2024-01-15T08:00:00Z",
  updated_at: "2025-03-20T10:30:00Z",
};

const MOCK_SUB_STATIONS: SubStation[] = [
  {
    id: "sub-001",
    station_id: "st-001",
    name: "屋顶A区",
    dc_capacity: 200,
    tilt_angle: 30,
    azimuth: 180,
    string_series: 20,
    string_parallel: 10,
    inv_brand: "华为",
    inv_model: "SUN2000-50KTL-M3",
    inv_ac_power: 50,
    inv_count: 4,
    mppt_count: 6,
    strings_per_mppt: 2,
    inv_sn_list: ["SN-20230101", "SN-20230102", "SN-20230103", "SN-20230104"],
    sort_order: 0,
  },
  {
    id: "sub-002",
    station_id: "st-001",
    name: "屋顶B区",
    dc_capacity: 150,
    tilt_angle: 15,
    azimuth: 150,
    string_series: 18,
    string_parallel: 8,
    inv_brand: "华为",
    inv_model: "SUN2000-40KTL-M3",
    inv_ac_power: 40,
    inv_count: 3,
    mppt_count: 4,
    strings_per_mppt: 2,
    inv_sn_list: ["SN-20230201", "SN-20230202", "SN-20230203"],
    sort_order: 1,
  },
  {
    id: "sub-003",
    station_id: "st-001",
    name: "南坡阵列",
    dc_capacity: 180,
    tilt_angle: 25,
    azimuth: 210,
    string_series: 22,
    string_parallel: 9,
    inv_brand: "阳光电源",
    inv_model: "SG50CX",
    inv_ac_power: 50,
    inv_count: 3,
    mppt_count: 6,
    strings_per_mppt: 2,
    inv_sn_list: ["SN-20230301", "SN-20230302", "SN-20230303"],
    sort_order: 2,
  },
];

// 模拟历史任务（PRD §4.5 任务时间线）
interface MockTask extends Task {
  pr?: number;
  equivalent_hours?: number;
  issues_count?: number;
}
const MOCK_TASKS: MockTask[] = [
  {
    id: "task-003",
    station_id: "st-001",
    owner_id: "user-1",
    status: "completed",
    scope: { sub_station_ids: ["sub-001", "sub-002", "sub-003"], date_range: { start: "2025-03-01", end: "2025-03-15" } },
    data_start: "2025-03-01",
    data_end: "2025-03-15",
    summary: {
      pr_actual: 85.2,
      pr_baseline: 73.38,
      pr_deviation: 11.82,
      energy_actual_kwh: 102300,
      energy_baseline_kwh: 88100,
      energy_deviation_kwh: 14200,
      revenue_actual: 39999,
      revenue_baseline: 34445,
      revenue_deviation: 5554,
    },
    report_number: "PVAI20250315103000001",
    created_at: "2025-03-15T10:30:00Z",
    completed_at: "2025-03-15T10:32:00Z",
    pr: 85.2,
    equivalent_hours: 92,
    issues_count: 1,
  },
  {
    id: "task-002",
    station_id: "st-001",
    owner_id: "user-1",
    status: "completed",
    scope: { sub_station_ids: ["sub-001", "sub-002", "sub-003"], date_range: { start: "2025-02-01", end: "2025-02-10" } },
    data_start: "2025-02-01",
    data_end: "2025-02-10",
    summary: {
      pr_actual: 82.1,
      pr_baseline: 70.47,
      pr_deviation: 11.63,
      energy_actual_kwh: 98000,
      energy_baseline_kwh: 84000,
      energy_deviation_kwh: 14000,
      revenue_actual: 38318,
      revenue_baseline: 32844,
      revenue_deviation: 5474,
    },
    report_number: "PVAI20250210140000001",
    created_at: "2025-02-10T14:00:00Z",
    completed_at: "2025-02-10T14:02:00Z",
    pr: 82.1,
    equivalent_hours: 89,
    issues_count: 3,
  },
  {
    id: "task-001",
    station_id: "st-001",
    owner_id: "user-1",
    status: "completed",
    scope: { sub_station_ids: ["sub-001", "sub-002"], date_range: { start: "2025-01-01", end: "2025-01-05" } },
    data_start: "2025-01-01",
    data_end: "2025-01-05",
    summary: {
      pr_actual: 78.4,
      pr_baseline: 66.00,
      pr_deviation: 12.4,
      energy_actual_kwh: 92000,
      energy_baseline_kwh: 77500,
      energy_deviation_kwh: 14500,
      revenue_actual: 35972,
      revenue_baseline: 30303,
      revenue_deviation: 5669,
    },
    report_number: "PVAI20250105160000001",
    created_at: "2025-01-05T16:00:00Z",
    completed_at: "2025-01-05T16:02:00Z",
    pr: 78.4,
    equivalent_hours: 84,
    issues_count: 5,
  },
];

// 任务状态图标映射
const STATUS_ICON: Record<Task["status"], React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  analyzing: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
};
const STATUS_LABEL: Record<Task["status"], string> = {
  pending: "待映射",
  analyzing: "分析中",
  completed: "已完成",
  failed: "已失败",
};
const STATUS_COLOR: Record<Task["status"], string> = {
  pending: "text-zinc-400 bg-zinc-100",
  analyzing: "text-blue-600 bg-blue-50",
  completed: "text-green-600 bg-green-50",
  failed: "text-red-600 bg-red-50",
};

export default function StationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [station] = useState<Station>(MOCK_STATION);
  const [subStations] = useState<SubStation[]>(MOCK_SUB_STATIONS);
  const [tasks] = useState<MockTask[]>(MOCK_TASKS);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  // ── 电站级装机总容量(AC) = Σ各子场站 逆变器额定功率 × 逆变器数量 ──
  const totalDcCapacity = useMemo(
    () => subStations.reduce((sum, s) => sum + s.dc_capacity, 0),
    [subStations]
  );
  const totalAcCapacity = useMemo(
    () => subStations.reduce((sum, s) => sum + s.inv_ac_power * s.inv_count, 0),
    [subStations]
  );

  // ── 对比选择逻辑 ──
  const toggleTaskSelect = (taskId: string) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  };
  const startCompare = () => {
    if (selectedTasks.size < 2) return;
    const ids = Array.from(selectedTasks).slice(0, 3); // 最多 3 个
    router.push(`/stations/${params.id}/compare?task_ids=${ids.join(",")}`);
  };

  return (
    <div className="space-y-6">
      {/* 顶部导航栏 */}
      <div className="flex items-center gap-4">
        <Link href="/stations">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {station.name}
            </h1>
            <Badge variant={station.status === "active" ? "default" : "secondary"}>
              {station.status === "active" ? "运行中" : "已归档"}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-zinc-500">
            <MapPin className="inline h-3.5 w-3.5 mr-1" />
            {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
            <span className="mx-2">·</span>
            资源区 {station.resource_zone} 类
            <span className="mx-2">·</span>
            {subStations.length} 个子场站
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/stations/${params.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit3 className="mr-2 h-3.5 w-3.5" />
              编辑电站
            </Button>
          </Link>
          <Link href={`/diagnose/upload?station_id=${params.id}`}>
            <Button size="sm">
              <Zap className="mr-2 h-3.5 w-3.5" />
              新建诊断
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Tab 切换：电站参数 | 子场站 | 任务历史 ── */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="text-sm">
            电站总览
          </TabsTrigger>
          <TabsTrigger value="substations" className="text-sm">
            子场站（{subStations.length}）
          </TabsTrigger>
          <TabsTrigger value="model3d" className="text-sm">
            <Box className="mr-1.5 h-3.5 w-3.5" />
            3D 模型
          </TabsTrigger>
          <TabsTrigger value="tasks" className="text-sm">
            诊断历史（{tasks.length}）
          </TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* Tab 1：电站总览（核心参数摘要卡） */}
        {/* ============================================================ */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={Zap}
              label="直流侧总容量"
              value={`${totalDcCapacity.toLocaleString()} kWp`}
            />
            <SummaryCard
              icon={Cpu}
              label="交流侧总容量"
              value={`${totalAcCapacity.toLocaleString()} kW`}
            />
            <SummaryCard
              icon={Sun}
              label="组件类型"
              value={`${station.module_type} · ${station.module_power}W`}
            />
            <SummaryCard
              icon={Calendar}
              label="并网日期"
              value={station.grid_conn_date || "未设置"}
            />
          </div>

          {/* 电站级参数详情 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">电站级公共参数</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 md:grid-cols-3">
                <ParamItem label="时区" value={station.timezone} />
                <ParamItem label="资源区" value={`${station.resource_zone} 类`} />
                <ParamItem label="并网电压" value={station.grid_voltage ? `${station.grid_voltage} kV` : "未设置"} />
                <ParamItem label="上网电价" value={station.feed_in_price ? `¥${station.feed_in_price}/kWh` : "未设置"} />
                <ParamItem label="组件型号" value={station.module_model || "未设置"} />
                <ParamItem label="温度系数" value={station.temp_coeff?.toString() || "按类型默认"} />
              </dl>
            </CardContent>
          </Card>

          {/* 最近一次诊断摘要 */}
          {tasks[0]?.summary && (
            <Card className="border-l-4 border-l-zinc-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  最近诊断摘要（{tasks[0].created_at ? new Date(tasks[0].created_at).toLocaleDateString("zh-CN") : ""}）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                  <MiniMetric
                    label="实际PR"
                    value={`${tasks[0].summary.pr_actual.toFixed(2)}%`}
                    positive
                  />
                  <MiniMetric
                    label="PR偏差"
                    value={`${tasks[0].summary.pr_deviation > 0 ? "+" : ""}${tasks[0].summary.pr_deviation.toFixed(2)}%`}
                    positive={tasks[0].summary.pr_deviation > 0}
                  />
                  <MiniMetric
                    label="等效小时"
                    value={`${tasks[0].equivalent_hours}h`}
                  />
                  <MiniMetric
                    label="发现问题"
                    value={`${tasks[0].issues_count} 项`}
                    positive={tasks[0].issues_count === 0}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ============================================================ */}
        {/* Tab 2：子场站列表 */}
        {/* ============================================================ */}
        <TabsContent value="substations" className="space-y-4">
          {subStations.map((sub) => (
            <Card key={sub.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-zinc-900">{sub.name}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      装机 {sub.dc_capacity} kWp · {sub.inv_count} 台 {sub.inv_brand} {sub.inv_model}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {sub.inv_ac_power * sub.inv_count} kW (AC)
                  </Badge>
                </div>
                <Separator className="my-3" />
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                  <ParamItem label="安装倾角" value={`${sub.tilt_angle}°`} />
                  <ParamItem label="方位角" value={`${sub.azimuth}°`} />
                  <ParamItem label="组串串联数" value={sub.string_series.toString()} />
                  <ParamItem label="逆变器额定功率" value={`${sub.inv_ac_power} kW`} />
                  {sub.string_parallel && (
                    <ParamItem label="组串并联数" value={sub.string_parallel.toString()} />
                  )}
                  {sub.mppt_count && (
                    <ParamItem label="MPPT路数" value={sub.mppt_count.toString()} />
                  )}
                  {sub.strings_per_mppt && (
                    <ParamItem label="每组MPPT组串数" value={sub.strings_per_mppt.toString()} />
                  )}
                </dl>
                {sub.inv_sn_list && sub.inv_sn_list.length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <div>
                      <span className="text-xs text-zinc-400">逆变器 SN：</span>
                      {sub.inv_sn_list.map((sn) => (
                        <Badge key={sn} variant="secondary" className="ml-1 text-[11px]">
                          {sn}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
          <Link href={`/stations/${params.id}/edit`}>
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-3.5 w-3.5" />
              添加子场站
            </Button>
          </Link>
        </TabsContent>

        {/* ============================================================ */}
        {/* Tab 3：3D 电站模型（PRD §4.6 渐进式可视化） */}
        {/* ============================================================ */}
        <TabsContent value="model3d" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Box className="h-4 w-4 text-zinc-500" />
                3D 电站可视化
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* 图例 */}
              <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-zinc-500">
                {subStations.map((sub, i) => (
                  <span key={sub.id} className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-3 w-3 rounded"
                      style={{ backgroundColor: ["#3B82F6", "#F59E0B", "#10B981"][i % 3] }}
                    />
                    {sub.name}
                  </span>
                ))}
              </div>
              <div className="h-[480px] rounded-lg overflow-hidden">
                <Station3DCanvas
                  stage={6}
                  longitude={station.longitude}
                  latitude={station.latitude}
                  subStations={subStations.map((sub, i): SubStation3D => ({
                    id: sub.id,
                    name: sub.name,
                    dcCapacity: sub.dc_capacity,
                    tiltAngle: sub.tilt_angle,
                    azimuth: sub.azimuth,
                    invCount: sub.inv_count,
                    invAcPower: sub.inv_ac_power,
                    healthStatus: i === 0 ? "good" : i === 1 ? "warning" : "good",
                  }))}
                  hasDiagnosis
                  healthScore={82}
                />
              </div>
              <p className="mt-3 text-xs text-zinc-400 text-center">
                阶段 6（数据已接入）— 拖动鼠标旋转/缩放，滚动查看细节 (PRD §4.6.2)
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================ */}
        {/* Tab 4：历史诊断任务时间线（PRD §4.5） */}
        {/* ============================================================ */}
        <TabsContent value="tasks" className="space-y-4">
          {/* 对比操作栏 */}
          {tasks.length > 1 && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (compareMode) {
                    setSelectedTasks(new Set());
                  }
                  setCompareMode(!compareMode);
                }}
              >
                <GitCompare className="mr-2 h-3.5 w-3.5" />
                {compareMode ? "取消对比" : "对比任务"}
              </Button>
              {compareMode && selectedTasks.size >= 2 && (
                <Button size="sm" onClick={startCompare}>
                  开始对比（{selectedTasks.size} 项）
                </Button>
              )}
              {compareMode && (
                <span className="text-xs text-zinc-400">
                  选择 2-3 个任务进行并排对比（PRD §4.2.3）
                </span>
              )}
            </div>
          )}

          {/* 任务时间线 */}
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart3 className="h-10 w-10 text-zinc-300" />
              <p className="mt-3 text-sm text-zinc-500">暂无诊断记录</p>
              <p className="text-xs text-zinc-400">上传运行数据后开始第一次诊断</p>
            </div>
          ) : (
            <div className="relative space-y-4">
              {/* 时间线竖线 */}
              <div className="absolute left-5 top-0 h-full w-px bg-zinc-200" />

              {tasks.map((task, index) => {
                const StatusIcon = STATUS_ICON[task.status];
                return (
                  <div key={task.id} className="relative pl-12">
                    {/* 时间线节点 */}
                    <div
                      className={cn(
                        "absolute left-3.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white",
                        task.status === "completed"
                          ? "bg-green-500 text-white"
                          : task.status === "failed"
                            ? "bg-red-500 text-white"
                            : task.status === "analyzing"
                              ? "bg-blue-500 text-white"
                              : "bg-zinc-300 text-white"
                      )}
                    >
                      <StatusIcon
                        className={cn(
                          "h-3.5 w-3.5",
                          task.status === "analyzing" && "animate-spin"
                        )}
                      />
                    </div>

                    {/* 任务卡片 */}
                    <Card
                      className={cn(
                        compareMode && "cursor-pointer transition-colors",
                        compareMode && selectedTasks.has(task.id) && "ring-2 ring-zinc-900"
                      )}
                      onClick={() => compareMode && task.status === "completed" && toggleTaskSelect(task.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-zinc-900">
                                任务 #{tasks.length - index}
                              </span>
                              <Badge
                                className={cn("text-[11px]", STATUS_COLOR[task.status])}
                              >
                                {STATUS_LABEL[task.status]}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-zinc-400">
                              {new Date(task.created_at).toLocaleDateString("zh-CN", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                              })}
                              {task.data_start && task.data_end && (
                                <span>
                                  {" · "}数据范围：{task.data_start} ~ {task.data_end}
                                </span>
                              )}
                              {task.report_number && (
                                <span className="ml-2 font-mono text-[10px]">
                                  {task.report_number}
                                </span>
                              )}
                            </p>
                          </div>

                          {/* 摘要指标 + 操作 */}
                          {task.status === "completed" && task.summary && (
                            <div className="flex items-center gap-4">
                              <div className="hidden text-right md:flex md:gap-5">
                                <div>
                                  <p className="text-[11px] text-zinc-400">PR</p>
                                  <p className="text-sm font-semibold text-zinc-900">
                                    {task.summary.pr_actual.toFixed(1)}%
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[11px] text-zinc-400">等效小时</p>
                                  <p className="text-sm font-semibold text-zinc-900">
                                    {task.equivalent_hours}h
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[11px] text-zinc-400">问题</p>
                                  <p
                                    className={cn(
                                      "text-sm font-semibold",
                                      task.issues_count === 0
                                        ? "text-green-600"
                                        : "text-amber-600"
                                    )}
                                  >
                                    {task.issues_count} 项
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Link href={`/reports/${task.id}`}>
                                  <Button variant="outline" size="sm" className="h-8 text-xs">
                                    <FileText className="mr-1 h-3 w-3" />
                                    查看报告
                                  </Button>
                                </Link>
                                <Button variant="ghost" size="sm" className="h-8 text-xs">
                                  <Download className="mr-1 h-3 w-3" />
                                  导出
                                </Button>
                              </div>
                            </div>
                          )}

                          {task.status === "failed" && (
                            <div className="text-right">
                              <p className="text-xs text-red-500">诊断失败</p>
                              {task.error_message && (
                                <p className="text-[11px] text-zinc-400">
                                  {task.error_message}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── 辅助小组件 ──

/** 摘要数据卡片 */
function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
          <Icon className="h-4 w-4 text-zinc-600" />
        </div>
        <div>
          <p className="text-[11px] text-zinc-400">{label}</p>
          <p className="text-sm font-semibold text-zinc-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** 参数键值对展示 */
function ParamItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className="text-sm text-zinc-700">{value}</dd>
    </div>
  );
}

/** 迷你指标（用于最近诊断摘要） */
function MiniMetric({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] text-zinc-400">{label}</p>
      <p
        className={cn(
          "text-lg font-semibold",
          positive === undefined
            ? "text-zinc-900"
            : positive
              ? "text-green-600"
              : "text-red-600"
        )}
      >
        {value}
      </p>
    </div>
  );
}
