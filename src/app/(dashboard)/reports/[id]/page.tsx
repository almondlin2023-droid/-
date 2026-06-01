"use client";

/**
 * 诊断报告详情页（PRD §5.3 完整7章节报告）
 *
 * 报告是产品价值的最终交付物。结构依据参考模板《松下新能源(无锡)分布式光伏发电项目》设计。
 *
 * 七章节：
 *   一、核心指标概览       — PR偏差大数字 + 核心指标卡
 *   二、损失分析与建议      — 损失瀑布图 + 已诊断损失处理建议
 *   三、数据质量            — 基本参数表 + 运行数据完整性
 *   四、发电表现分析        — 月度满发小时表 + 对比柱状图
 *   五、发电损失因素分析    — 月度PR交叉表 + 各类损失详析
 *   六、离线详情            — 采集器/逆变器离线记录
 *   七、附录               — 名词解释 + 损失分析说明 + 免责申明
 *
 * 双模态设计（PRD §5.3.0）：在线交互式预览可下钻，导出版为静态PDF/Excel。
 */

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Zap,
  BarChart3,
  Calendar,
  FileText,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ── 模拟报告完整数据 ──
const MOCK_REPORT = {
  id: "task-004",
  stationName: "西郊分布式光伏电站",
  stationId: "st-001",
  reportNumber: "PVAI20250315103000001",
  createdAt: "2025-03-15T10:30:00Z",
  dataRange: { start: "2025-03-01", end: "2025-03-15" },
  feedInPrice: 0.391,

  // 核心指标
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

  // 电站基本参数
  stationParams: {
    longitude: 120.1234,
    latitude: 31.5678,
    timezone: "Asia/Shanghai",
    resourceZone: "III",
    gridConnDate: "2023-06-15",
    moduleType: "单晶",
    moduleModel: "LR5-72HPH-545M",
    modulePower: 545,
    subStationCount: 3,
    totalDcCapacity: 530,
    totalAcCapacity: 460,
  },

  // 第三章：数据质量
  dataQuality: {
    totalRows: 4321,
    validRows: 4280,
    missingRate: 0.95,
    timeCoverage: "100%",
    avgIntervalMin: 5,
    encoding: "UTF-8",
    delimiter: ",",
    fileCount: 3,
    notes: "个别采样点的组件温度数据缺失（缺失率<1%），以插值填补处理后用于计算",
  },

  // 第四章：月度满发小时（实际 vs 基准）
  monthlyFullLoadHours: [
    { month: "2025-01", actual: 84, baseline: 78 },
    { month: "2025-02", actual: 89, baseline: 80 },
    { month: "2025-03", actual: 92, baseline: 75 },
  ],

  // 第五章：月度 PR 交叉表（PRD §5.2.5 核心输出格式）
  monthlyPRTable: [
    {
      month: "2025-01", prActual: 78.40, prBaseline: 66.00, prDeviation: 12.40,
      gridLoss: -0.22, shutdownLoss: 0, overUnderVoltLoss: 0,
      shadowLoss: -0.01, clippingLoss: 0, soilingLoss: -0.03, stringLoss: 0,
      otherLoss: 12.66,
    },
    {
      month: "2025-02", prActual: 82.10, prBaseline: 70.47, prDeviation: 11.63,
      gridLoss: -0.76, shutdownLoss: 0, overUnderVoltLoss: 0,
      shadowLoss: -0.02, clippingLoss: 0, soilingLoss: -0.04, stringLoss: 0,
      otherLoss: 12.45,
    },
    {
      month: "2025-03", prActual: 85.20, prBaseline: 73.38, prDeviation: 11.82,
      gridLoss: -0.34, shutdownLoss: 0, overUnderVoltLoss: 0,
      shadowLoss: -0.18, clippingLoss: 0, soilingLoss: -0.10, stringLoss: -0.01,
      otherLoss: 12.45,
    },
  ],

  // 第二章：损失分解 + 建议
  lossBreakdown: [
    {
      key: "grid_loss", label: "脱网损失",
      prLoss: -0.34, kwhLoss: 348, suggestion:
        "建议与电工沟通尽快恢复并网；检查国网并网线和变压器连接状态；确认电网近期是否有计划性检修（PRD §5.3.3 B）",
      events: [
        { device: "SN-20230101", time: "2025-03-02 03:15-06:40", durationH: 3.4, lossKwh: 200 },
        { device: "SN-20230102", time: "2025-03-08 12:00-14:30", durationH: 2.5, lossKwh: 148 },
      ],
    },
    {
      key: "shadow_loss", label: "阴影损失",
      prLoss: -0.18, kwhLoss: 184, suggestion:
        "建议现场排查遮挡源（周边建筑、树木、同排组件间互相遮挡）；调整组件间距或修剪遮挡植被（PRD §5.3.3 B）",
      events: [
        { device: "子场站B区", time: "每日9:00-10:30", durationH: 1.5, lossKwh: 92 },
      ],
    },
    {
      key: "soiling_loss", label: "灰尘损失",
      prLoss: -0.10, kwhLoss: 102, suggestion:
        "建议安排组件清洗；3月份PM2.5均值偏高（62μg/m³），结合降雨数据（仅2天有效降雨），清洗后可恢复约0.08% PR",
      events: [],
    },
    {
      key: "string_loss", label: "掉串损失",
      prLoss: -0.01, kwhLoss: 10, suggestion:
        "现场检查对应组串MC4接头和保险丝；排查是否存在动物咬损线缆或接头松动",
      events: [
        { device: "子场站C区 MPPT#3", time: "2025-03-05 全天", durationH: 8, lossKwh: 10 },
      ],
    },
  ],

  // 第六章：离线事件
  offlineEvents: [
    {
      loggerSn: "采集器-SN20230101",
      inverterSn: "SN-20230101",
      offlineHours: 2.5,
      offlineCount: 2,
      exampleDates: ["2025-03-05", "2025-03-08"],
    },
    {
      loggerSn: "采集器-SN20230105",
      inverterSn: "SN-20230103",
      offlineHours: 1.0,
      offlineCount: 1,
      exampleDates: ["2025-03-12"],
    },
  ],

  // 电站级聚合（用于瀑布图）
  waterfall: [
    { key: "theory", label: "理论发电量", value: 100, isLoss: false },
    { key: "grid_loss", label: "脱网损失", value: 0.34, isLoss: true },
    { key: "shadow_loss", label: "阴影损失", value: 0.18, isLoss: true },
    { key: "soiling_loss", label: "灰尘损失", value: 0.10, isLoss: true },
    { key: "string_loss", label: "掉串损失", value: 0.01, isLoss: true },
    { key: "other", label: "其他损失", value: 14.10, isLoss: false },
    { key: "actual", label: "实际发电量", value: 85.27, isLoss: false },
  ],
};

// ── 损失类型中文名称映射 ──
const LOSS_LABELS: Record<string, string> = {
  grid_loss: "脱网损失",
  shutdown_loss: "停机损失",
  over_under_volt_loss: "过欠压损失",
  shadow_loss: "阴影损失",
  clipping_loss: "限额损失",
  soiling_loss: "灰尘损失",
  string_loss: "掉串损失",
};

// ── 附录名词解释 ──
const GLOSSARY = [
  { term: "PR (Performance Ratio)", def: "性能比，光伏电站实际发电量与理论发电量的比值，是衡量电站整体运行效率的核心指标。PR = 实际发电量 ÷ (倾斜面辐照量 × 组件容量 / 标准辐照度)。" },
  { term: "满发小时 (Full Load Hours)", def: "等效满负荷发电小时数，表示电站按额定功率运行相当于满发了多少小时。计算公式：实际发电量 ÷ 组件容量。" },
  { term: "GTI (Global Tilted Irradiance)", def: "倾斜面总辐照度，表示照射到倾斜组件表面的太阳辐射总量（W/m²）。" },
  { term: "GHI (Global Horizontal Irradiance)", def: "水平面总辐照度，可通过Hay & Davies各向异性模型换算为GTI。" },
  { term: "离散率 (Coefficient of Variation)", def: "变异系数，标准差与平均值的比值。用于衡量数据的离散程度，限额识别中用于判断是否出现削峰平台。" },
  { term: "erf (Error Function)", def: "高斯误差函数，在光伏诊断中用于灰尘损失计算（NREL模型）。" },
];

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const [report] = useState(MOCK_REPORT);
  const [activeSection, setActiveSection] = useState("overview");

  const deviationIsPositive = report.summary.pr_deviation > 0;

  return (
    <div className="space-y-8">
      {/* ── 报告头部 ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/reports">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {report.stationName} — 健康诊断报告
              </h1>
              <Badge variant="default">已完成</Badge>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              报告编号：{report.reportNumber}
              <span className="mx-2">·</span>
              诊断日期：{new Date(report.createdAt).toLocaleDateString("zh-CN")}
              <span className="mx-2">·</span>
              数据范围：{report.dataRange.start} ~ {report.dataRange.end}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
              <Download className="mr-1.5 h-4 w-4" />
              导出报告
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>导出 PDF（A4排版）</DropdownMenuItem>
              <DropdownMenuItem>导出 Excel（多Sheet）</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>下载诊断原始数据</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── 章节导航（快速跳转） ── */}
      <Card className="sticky top-0 z-10">
        <CardContent className="flex items-center gap-1 p-2 flex-wrap">
          {[
            { key: "overview", label: "一、核心指标概览" },
            { key: "loss", label: "二、损失分析与建议" },
            { key: "quality", label: "三、数据质量" },
            { key: "performance", label: "四、发电表现分析" },
            { key: "factors", label: "五、发电损失因素分析" },
            { key: "offline", label: "六、离线详情" },
            { key: "appendix", label: "七、附录" },
          ].map((section) => (
            <button
              key={section.key}
              onClick={() => {
                setActiveSection(section.key);
                document.getElementById(`section-${section.key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                activeSection === section.key
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
              )}
            >
              {section.label}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 一、核心指标概览（PRD §5.3.2） */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section id="section-overview">
        <SectionTitle number="一" title="核心指标概览" />
        <p className="text-sm text-zinc-400 -mt-4 mb-4">
          让读者在10秒内掌握场站整体表现（PRD §5.3.2）
        </p>

        {/* PR偏差大数字卡片 */}
        <Card className="border-l-4 border-l-zinc-900 mb-6">
          <CardContent className="flex items-center justify-between py-6">
            <div>
              <p className="text-xs text-zinc-400 mb-1">PR 偏差（实际 PR - 基准 PR）</p>
              <div className="flex items-baseline gap-3">
                <span
                  className={cn(
                    "text-5xl font-bold tabular-nums tracking-tight",
                    deviationIsPositive ? "text-green-600" : "text-red-600"
                  )}
                >
                  {report.summary.pr_deviation > 0 ? "+" : ""}
                  {report.summary.pr_deviation.toFixed(2)}%
                </span>
                {deviationIsPositive ? (
                  <TrendingUp className="h-8 w-8 text-green-500" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-500" />
                )}
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                {deviationIsPositive
                  ? "场站表现优于基准，运营良好"
                  : "场站表现低于基准，存在损失需要排查"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-right">
              <MetricRow label="实际 PR" value={`${report.summary.pr_actual.toFixed(2)}%`} />
              <MetricRow label="基准 PR" value={`${report.summary.pr_baseline.toFixed(2)}%`} />
              <MetricRow label="实际发电量" value={`${(report.summary.energy_actual_kwh / 10000).toFixed(1)} 万 kWh`} />
              <MetricRow label="基准发电量" value={`${(report.summary.energy_baseline_kwh / 10000).toFixed(1)} 万 kWh`} />
            </div>
          </CardContent>
        </Card>

        {/* 电量/收益偏差卡片组 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-4">
          <SummaryCard
            icon={Zap}
            label="电量偏差"
            value={`${report.summary.energy_deviation_kwh > 0 ? "+" : ""}${(report.summary.energy_deviation_kwh / 10000).toFixed(2)} 万 kWh`}
            positive={report.summary.energy_deviation_kwh > 0}
          />
          <SummaryCard
            icon={BarChart3}
            label="收益偏差"
            value={`${report.summary.revenue_deviation > 0 ? "+" : ""}¥${report.summary.revenue_deviation.toLocaleString()}`}
            positive={report.summary.revenue_deviation > 0}
          />
          <SummaryCard
            icon={Info}
            label="实际收益"
            value={`¥${report.summary.revenue_actual.toLocaleString()}`}
          />
        </div>
        <p className="text-[11px] text-zinc-400">
          * 电价说明：按照场站所在地区脱硫煤标杆电价({report.feedInPrice}元/kWh)计算收益
        </p>
      </section>

      <Separator className="my-8" />

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 二、损失分析与建议（PRD §5.3.3） */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section id="section-loss">
        <SectionTitle number="二" title="损失分析与建议" />
        <p className="text-sm text-zinc-400 -mt-4 mb-6">
          从理论辐照量逐项扣减至实际发电量，清晰展示每类损失对发电量的影响（PRD §5.3.3）
        </p>

        {/* 损失瀑布图（纯CSS模拟） */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">损失瀑布图</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.waterfall.map((item, idx) => (
                <div key={item.key} className="flex items-center gap-3">
                  <span className="w-28 text-xs text-zinc-500 shrink-0">{item.label}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div
                      className={cn(
                        "h-7 rounded transition-all",
                        item.isLoss
                          ? "bg-red-400"
                          : item.key === "actual"
                            ? "bg-green-500"
                            : "bg-zinc-300"
                      )}
                      style={{ width: `${item.value}%` }}
                    />
                    <span
                      className={cn(
                        "text-xs font-mono tabular-nums shrink-0",
                        item.isLoss ? "text-red-600" : "text-zinc-600"
                      )}
                    >
                      {item.isLoss ? `-${item.value.toFixed(2)}%` : `${item.value.toFixed(2)}%`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 各类损失的处理建议 */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-800">
            ★ 已诊断损失的处理建议（有明确数据证据，可定位到设备）
          </h3>
          {report.lossBreakdown.map((loss) => (
            <Card key={loss.key} className="border-l-4 border-l-amber-400">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-semibold">{loss.label}</span>
                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                      {loss.prLoss.toFixed(2)}% PR（{loss.kwhLoss} kWh）
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-zinc-600 mb-2">{loss.suggestion}</p>
                {loss.events.length > 0 && (
                  <div className="mt-3 rounded-lg bg-zinc-50 p-3">
                    <p className="text-xs font-medium text-zinc-500 mb-1.5">故障事件明细：</p>
                    {loss.events.map((evt, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                        <span className="font-mono">{evt.time}</span>
                        <span>{evt.device}</span>
                        <span>{evt.durationH}h</span>
                        <span>{evt.lossKwh} kWh</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 其他损失说明 */}
        <Card className="mt-4 bg-zinc-50">
          <CardContent className="py-3">
            <p className="text-xs text-zinc-500">
              <strong>其他损失（含温度、降雪/雾、安装条件、组件效率、组件连接、组串匹配度、直流线损、逆变器效率、光致衰减、入射角修正、自然寿命衰减）</strong>
              ：这些损失项在V1阶段缺少独立识别的传感器条件，以默认参数/理论模型推算，合并展示。
              随着数据维度增加（如接入气象站、组件级监测），可逐步拆解为独立诊断项（PRD §5.2.0）。
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 三、数据质量（PRD §5.3.4） */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section id="section-quality">
        <SectionTitle number="三" title="数据质量" />
        <p className="text-sm text-zinc-400 -mt-4 mb-4">
          数据完整性校验和基本参数一览，确保诊断结论的可靠性
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* 基本参数表 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">电站基本参数</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {[
                  ["经度", report.stationParams.longitude.toFixed(6)],
                  ["纬度", report.stationParams.latitude.toFixed(6)],
                  ["时区", report.stationParams.timezone],
                  ["资源区", `${report.stationParams.resourceZone} 类`],
                  ["并网日期", report.stationParams.gridConnDate],
                  ["组件类型", report.stationParams.moduleType],
                  ["组件型号", report.stationParams.moduleModel],
                  ["单块功率", `${report.stationParams.modulePower} Wp`],
                  ["直流侧容量", `${report.stationParams.totalDcCapacity} kWp`],
                  ["交流侧容量", `${report.stationParams.totalAcCapacity} kW`],
                  ["子场站数", `${report.stationParams.subStationCount} 个`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-zinc-400">{label}</dt>
                    <dd className="text-sm text-zinc-700">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {/* 运行数据完整性 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">运行数据完整性</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {[
                  ["总数据行数", report.dataQuality.totalRows.toLocaleString()],
                  ["有效行数", report.dataQuality.validRows.toLocaleString()],
                  ["缺失率", `${report.dataQuality.missingRate}%`],
                  ["时间覆盖", report.dataQuality.timeCoverage],
                  ["平均采样间隔", `${report.dataQuality.avgIntervalMin} 分钟`],
                  ["文件编码", report.dataQuality.encoding],
                  ["分隔符", report.dataQuality.delimiter === "," ? "逗号 (,)" : report.dataQuality.delimiter],
                  ["上传文件数", `${report.dataQuality.fileCount} 个`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-zinc-400">{label}</dt>
                    <dd className="text-sm text-zinc-700">{value}</dd>
                  </div>
                ))}
              </dl>
              {report.dataQuality.notes && (
                <div className="mt-3 flex items-start gap-1.5 rounded bg-blue-50 px-2.5 py-2 text-xs text-blue-700">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  {report.dataQuality.notes}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-8" />

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 四、发电表现分析（PRD §5.3.5） */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section id="section-performance">
        <SectionTitle number="四" title="发电表现分析" />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">月度满发小时对比（实际 vs 基准）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.monthlyFullLoadHours.map((m) => {
                const diff = m.actual - m.baseline;
                const actualPct = m.actual / Math.max(...report.monthlyFullLoadHours.map((x) => x.actual)) * 100;
                const baselinePct = m.baseline / Math.max(...report.monthlyFullLoadHours.map((x) => x.baseline)) * 100;
                return (
                  <div key={m.month} className="flex items-center gap-4">
                    <span className="w-20 text-sm font-medium text-zinc-700 shrink-0">
                      {m.month}
                    </span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400 w-8 shrink-0">实际</span>
                        <div className="flex-1 bg-zinc-100 rounded-full h-5 relative overflow-hidden">
                          <div className="absolute inset-y-0 left-0 bg-green-500 rounded-full transition-all" style={{ width: `${actualPct}%` }} />
                          <span className="absolute inset-y-0 left-2 flex items-center text-xs font-medium text-white">{m.actual}h</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400 w-8 shrink-0">基准</span>
                        <div className="flex-1 bg-zinc-100 rounded-full h-5 relative overflow-hidden">
                          <div className="absolute inset-y-0 left-0 bg-zinc-400 rounded-full transition-all" style={{ width: `${baselinePct}%` }} />
                          <span className="absolute inset-y-0 left-2 flex items-center text-xs font-medium text-white">{m.baseline}h</span>
                        </div>
                      </div>
                    </div>
                    <span className={cn("text-sm font-semibold tabular-nums shrink-0 w-16 text-right", diff >= 0 ? "text-green-600" : "text-red-600")}>
                      {diff >= 0 ? "+" : ""}{diff}h
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 五、发电损失因素分析（PRD §5.3.6 月度PR交叉表） */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section id="section-factors">
        <SectionTitle number="五" title="发电损失因素分析" />
        <p className="text-sm text-zinc-400 -mt-4 mb-4">
          PRD §5.2.5 核心输出格式：月度交叉报表，展示各月PR及各类损失分解
        </p>

        <Card className="overflow-x-auto">
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-3 py-2.5 text-left font-medium text-zinc-500">指标</th>
                  {report.monthlyPRTable.map((row) => (
                    <th key={row.month} className="px-3 py-2.5 text-center font-medium text-zinc-500">
                      {row.month}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* PR行 */}
                {[
                  { key: "prActual", label: "实际 PR", format: (v: number) => `${v.toFixed(2)}%`, valueClass: "text-zinc-900 font-semibold" },
                  { key: "prBaseline", label: "基准 PR", format: (v: number) => `${v.toFixed(2)}%`, valueClass: "text-zinc-500" },
                  { key: "prDeviation", label: "PR 偏差", format: (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`, valueClass: (v: number) => v >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold" },
                ].map(({ key, label, format, valueClass }) => (
                  <tr key={key} className="border-b border-zinc-100">
                    <td className="px-3 py-2 text-zinc-600 font-medium">{label}</td>
                    {report.monthlyPRTable.map((row) => (
                      <td key={row.month} className={cn("px-3 py-2 text-center tabular-nums", typeof valueClass === "function" ? valueClass(row[key as keyof typeof row] as number) : valueClass)}>
                        {format(row[key as keyof typeof row] as number)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-b border-zinc-200">
                  <td colSpan={report.monthlyPRTable.length + 1} className="px-3 py-1.5 bg-zinc-50">
                    <span className="text-[10px] text-zinc-400 font-medium">已诊断损失（可识别故障）</span>
                  </td>
                </tr>
                {/* 7类已诊断损失 */}
                {["gridLoss", "shutdownLoss", "overUnderVoltLoss", "shadowLoss", "clippingLoss", "soilingLoss", "stringLoss"].map((lossKey) => {
                  const label = LOSS_LABELS[lossKey.replace("Loss", "_loss").replace(/([A-Z])/g, "_$1").toLowerCase()] || lossKey;
                  return (
                    <tr key={lossKey} className="border-b border-zinc-100">
                      <td className="px-3 py-1.5 text-zinc-500 pl-6">{label}</td>
                      {report.monthlyPRTable.map((row) => {
                        const val = row[lossKey as keyof typeof row] as number;
                        return (
                          <td key={row.month} className={cn("px-3 py-1.5 text-center tabular-nums", val !== 0 ? "text-red-600" : "text-zinc-300")}>
                            {val !== 0 ? `${val.toFixed(2)}%` : "0"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr className="border-b border-zinc-200">
                  <td colSpan={report.monthlyPRTable.length + 1} className="px-3 py-1.5 bg-zinc-50">
                    <span className="text-[10px] text-zinc-400 font-medium">其他损失（合并展示）</span>
                  </td>
                </tr>
                <tr className="border-b border-zinc-100">
                  <td className="px-3 py-1.5 text-zinc-500 pl-6">其他损失</td>
                  {report.monthlyPRTable.map((row) => (
                    <td key={row.month} className={cn("px-3 py-1.5 text-center tabular-nums", row.otherLoss >= 0 ? "text-green-600" : "text-red-600")}>
                      {row.otherLoss > 0 ? "+" : ""}{row.otherLoss.toFixed(2)}%
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        <p className="mt-3 text-[11px] text-zinc-400">
          * 当PR偏差为正时，说明场站实际表现高于基准计算值。"其他损失"为正数时表示该部分优于基准预期。
          ** 已诊断损失均为负值（表示对发电的负面影响），其他损失 = PR偏差 - 已诊断PR损失。
        </p>
      </section>

      <Separator className="my-8" />

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 六、离线详情（PRD §5.3.7） */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section id="section-offline">
        <SectionTitle number="六" title="离线详情" />
        <p className="text-sm text-zinc-400 -mt-4 mb-4">
          采集器/逆变器设备离线事件记录
        </p>

        {report.offlineEvents.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-2 py-6 text-center">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm text-zinc-500">本次诊断期间未检测到设备离线事件</span>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
                    <th className="px-4 py-2.5 text-left font-medium">采集器编号</th>
                    <th className="px-4 py-2.5 text-left font-medium">逆变器编号</th>
                    <th className="px-4 py-2.5 text-right font-medium">离线时长(h)</th>
                    <th className="px-4 py-2.5 text-right font-medium">离线次数</th>
                    <th className="px-4 py-2.5 text-left font-medium">示例日期</th>
                  </tr>
                </thead>
                <tbody>
                  {report.offlineEvents.map((evt, i) => (
                    <tr key={i} className="border-b border-zinc-100">
                      <td className="px-4 py-2.5 font-mono text-xs">{evt.loggerSn}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{evt.inverterSn}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{evt.offlineHours}h</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{evt.offlineCount} 次</td>
                      <td className="px-4 py-2.5 text-xs text-zinc-400">{evt.exampleDates.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </section>

      <Separator className="my-8" />

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 七、附录（PRD §5.3.8） */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section id="section-appendix" className="pb-12">
        <SectionTitle number="七" title="附录" />

        {/* 名词解释 */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">名词解释</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {GLOSSARY.map((item) => (
                <div key={item.term}>
                  <dt className="text-sm font-medium text-zinc-800">{item.term}</dt>
                  <dd className="mt-0.5 text-xs text-zinc-500 leading-relaxed">{item.def}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {/* 损失分析说明 */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">损失分析说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-xs text-zinc-500 leading-relaxed">
              <p>
                <strong>1. 分析模型依据</strong>：本报告基于《光伏电站损失分析模型说明文档（I-A-052021001）》中定义的14项损失分析模型。
                每项损失的计算方法和参数取值详见该文档及本报告第五章说明。
              </p>
              <p>
                <strong>2. 关键参数说明</strong>：
                组件衰减——并网首年2.5%，后续每年0.7%；直流线损——固定1.5%；
                灰尘损失——基于NREL模型结合当地PM2.5/PM10/降雨数据计算；
                阴影损失——基于阴影识别模型V1.1（晴天样本充足条件下可靠性高）。
              </p>
              <p>
                <strong>3. V1阶段局限</strong>：其他损失包含10个子项的合并值，随数据维度增加（接入气象站、组件级监测），未来版本可逐步拆解。
              </p>
              <p>
                <strong>4. 数据降级说明</strong>：当外部气象数据不可用时，灰尘损失、降雪损失等依赖外部数据的分析项将降级至"其他损失"中合并展示，并在数据质量章节标注。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 免责申明 */}
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              免责申明
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-zinc-500 leading-relaxed space-y-2">
              <p>
                1. 本报告基于用户上传的逆变器运行数据及系统内置的分析模型自动生成，仅供运维参考，不构成任何形式的发电量保证或商业承诺。
              </p>
              <p>
                2. 诊断结论的准确性依赖于上传数据的完整性和准确性。若数据存在缺失、篡改或质量不足，系统将在"数据质量"章节标注，相关结论仅供参考。
              </p>
              <p>
                3. 外部气象数据（辐照度、PM2.5/PM10、降雨量等）来源于第三方气象数据服务商，其准确性和时效性由数据提供方负责。
              </p>
              <p>
                4. 基准PR数据来源于平台上已授权的匿名化场站数据集合及公开气象/辐照数据源，按月度更新。冷启动阶段（周围无可参考场站）使用目标场站自身的设计PR作为临时基准。
              </p>
              <p>
                5. 本报告的处置建议为通用性建议，具体实施方案应结合现场实际条件，由专业运维人员评估后执行。
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// ── 辅助组件 ──

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <h2 className="text-lg font-semibold text-zinc-900 mb-4">
      {number}、{title}
    </h2>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-zinc-400">{label}</p>
      <p className="text-sm font-semibold text-zinc-700 tabular-nums">{value}</p>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  positive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
          <Icon className="h-4 w-4 text-zinc-600" />
        </div>
        <div>
          <p className="text-[11px] text-zinc-400">{label}</p>
          <p
            className={cn(
              "text-sm font-semibold tabular-nums",
              positive === undefined ? "text-zinc-900" : positive ? "text-green-600" : "text-red-600"
            )}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
