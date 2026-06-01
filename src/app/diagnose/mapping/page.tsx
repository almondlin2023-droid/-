"use client";

/**
 * 诊断流程 — 字段映射确认页（PRD §5.1 阶段二/三）
 *
 * 这是产品核心差异化能力的前端交互载体，包含：
 *   - AI 首轮推荐的映射结果展示（§5.1.2）
 *   - 置信度可视化（进度条 + 颜色分级）
 *   - 用户逐项确认/修改/忽略映射
 *   - 渐进式智能推荐卡片（§5.1.4）
 *   - 必要字段校验（D1-D6, D9, D15）
 *   - 撤消/重做操作栈
 *
 * 映射结果确认后 → POST /api/v1/tasks/:id/confirm 触发异步诊断（§4.2.1）
 */

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Pencil,
  EyeOff,
  Undo2,
  Redo2,
  Info,
  AlertTriangle,
  Search,
  Lightbulb,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── 标准字段列表（PRD §3.2.1 运行数据字段全集） ──
// 按类别分组，便于用户在映射选择器中快速定位
const STANDARD_FIELDS = [
  {
    category: "A. 逆变器交直流电气数据（核心）",
    fields: [
      { code: "D0", name: "设备标识/逆变器SN", required: true },
      { code: "D1", name: "时间戳/采集时间", required: true },
      { code: "D2", name: "直流电压", required: true },
      { code: "D3", name: "直流电流", required: true },
      { code: "D4", name: "交流电压（相电压）", required: true },
      { code: "D5", name: "交流电流", required: true },
      { code: "D6", name: "有功功率/交流输出功率", required: true },
      { code: "D7", name: "无功功率", required: false },
      { code: "D8", name: "功率因数", required: false },
      { code: "D9", name: "当日发电量", required: true },
      { code: "D10", name: "累计发电量", required: false },
      { code: "D11", name: "工作时长/运行时长", required: false },
      { code: "D12", name: "逆变器温度/机内温度", required: false },
    ],
  },
  {
    category: "B. MPPT/组串级数据",
    fields: [
      { code: "D13", name: "MPPT回路编号", required: false },
      { code: "D14", name: "MPPT直流电压", required: false },
      { code: "D15", name: "组串/MPPT直流电流", required: true },
      { code: "D16", name: "MPPT功率", required: false },
    ],
  },
  {
    category: "C. 气象/环境数据",
    fields: [
      { code: "D17", name: "水平面总辐照度(GHI)", required: false },
      { code: "D18", name: "倾斜面辐照度(GTI/POA)", required: false },
      { code: "D19", name: "环境温度", required: false },
      { code: "D20", name: "组件温度/背板温度", required: false },
      { code: "D21", name: "风速", required: false },
      { code: "D22", name: "风向", required: false },
    ],
  },
  {
    category: "D. 设备状态/故障数据",
    fields: [
      { code: "D23", name: "逆变器运行状态", required: false },
      { code: "D24", name: "故障代码", required: false },
      { code: "D25", name: "限功率标志/指令", required: false },
    ],
  },
];

// 所有字段的 code → name 映射（用于快速查询）
const FIELD_MAP = new Map<string, string>();
STANDARD_FIELDS.forEach((g) => g.fields.forEach((f) => FIELD_MAP.set(f.code, f.name)));

// 必要字段集合
const REQUIRED_FIELDS = new Set(
  STANDARD_FIELDS.flatMap((g) => g.fields.filter((f) => f.required).map((f) => f.code))
);

// ── 置信度颜色与显示 ──
function getConfidenceColor(score: number): string {
  if (score >= 90) return "bg-green-500";
  if (score >= 75) return "bg-green-400";
  if (score >= 60) return "bg-amber-400";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-400";
}

function getConfidenceBadge(score: number): { label: string; color: string } {
  if (score >= 90) return { label: "高", color: "text-green-600 bg-green-50" };
  if (score >= 75) return { label: "中", color: "text-amber-600 bg-amber-50" };
  if (score >= 50) return { label: "低", color: "text-orange-600 bg-orange-50" };
  return { label: "待确认", color: "text-red-600 bg-red-50" };
}

// ── 映射列数据类型 ──
interface MappedColumn {
  colIndex: number;
  colName: string;
  sampleValues: string[];        // 前 3 行数据预览
  mappedField: string | null;    // 映射到的标准字段 code（null = 未映射）
  confidence: number;            // 0-100, 仅当有AI推荐时 > 0
  status: "recommended" | "confirmed" | "ignored" | "unmapped";
  // "recommended" = AI推荐但用户尚未确认
  // "confirmed" = 用户确认/手动映射
  // "ignored" = 用户标记为忽略
  // "unmapped" = AI未识别, 用户也未映射
}

// ── 撤消栈操作记录 ──
interface MappingAction {
  colIndex: number;
  prevField: string | null;
  prevStatus: MappedColumn["status"];
  newField: string | null;
  newStatus: MappedColumn["status"];
}

// ── 模拟：AI 识别后的列数据 ──
const MOCK_COLUMNS: MappedColumn[] = [
  { colIndex: 1, colName: "时间", sampleValues: ["2024-01-01 00:00", "2024-01-01 00:05", "2024-01-01 00:10"], mappedField: "D1", confidence: 98, status: "recommended" },
  { colIndex: 2, colName: "有功功率", sampleValues: ["3.2", "5.1", "4.8"], mappedField: "D6", confidence: 98, status: "recommended" },
  { colIndex: 3, colName: "VDC1", sampleValues: ["380", "382", "379"], mappedField: "D2", confidence: 88, status: "recommended" },
  { colIndex: 4, colName: "IDC1", sampleValues: ["8.4", "13.4", "12.6"], mappedField: "D3", confidence: 85, status: "recommended" },
  { colIndex: 5, colName: "VAC1", sampleValues: ["220", "221", "219"], mappedField: "D4", confidence: 92, status: "recommended" },
  { colIndex: 6, colName: "IAC1", sampleValues: ["12.3", "15.6", "14.1"], mappedField: "D5", confidence: 90, status: "recommended" },
  { colIndex: 7, colName: "日发电量", sampleValues: ["45.2", "52.8", "48.3"], mappedField: "D9", confidence: 94, status: "recommended" },
  { colIndex: 8, colName: "VDC2", sampleValues: ["378", "380", "381"], mappedField: "D2", confidence: 72, status: "recommended" },
  { colIndex: 9, colName: "IDC2", sampleValues: ["8.1", "13.0", "12.3"], mappedField: "D3", confidence: 70, status: "recommended" },
  { colIndex: 10, colName: "VAC2", sampleValues: ["221", "222", "220"], mappedField: "D4", confidence: 68, status: "recommended" },
  { colIndex: 11, colName: "IAC2", sampleValues: ["11.9", "15.1", "13.8"], mappedField: "D5", confidence: 66, status: "recommended" },
  { colIndex: 12, colName: "无功功率", sampleValues: ["1.2", "1.5", "1.3"], mappedField: "D7", confidence: 96, status: "recommended" },
  { colIndex: 13, colName: "PF", sampleValues: ["0.96", "0.95", "0.97"], mappedField: "D8", confidence: 93, status: "recommended" },
  { colIndex: 14, colName: "累计电量", sampleValues: ["10245", "10250", "10255"], mappedField: "D10", confidence: 91, status: "recommended" },
  { colIndex: 15, colName: "YGFGL", sampleValues: ["3.2", "5.1", "4.8"], mappedField: null, confidence: 0, status: "unmapped" },
  { colIndex: 16, colName: "col_23", sampleValues: ["4.5", "4.3", "4.7"], mappedField: null, confidence: 0, status: "unmapped" },
  { colIndex: 17, colName: "温度1", sampleValues: ["25", "26", "24"], mappedField: "D19", confidence: 74, status: "recommended" },
  { colIndex: 18, colName: "Str1_Curr", sampleValues: ["8.4", "13.4", "12.6"], mappedField: "D15", confidence: 78, status: "recommended" },
];

export default function MappingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [columns, setColumns] = useState<MappedColumn[]>(MOCK_COLUMNS);
  const [undoStack, setUndoStack] = useState<MappingAction[]>([]);
  const [redoStack, setRedoStack] = useState<MappingAction[]>([]);
  const [editingCol, setEditingCol] = useState<number | null>(null);
  const [searchField, setSearchField] = useState("");
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── 统计 ──
  const totalFields = columns.length;
  const confirmedCount = columns.filter((c) => c.status === "confirmed").length;
  const recommendedCount = columns.filter((c) => c.status === "recommended").length;
  const ignoredCount = columns.filter((c) => c.status === "ignored").length;
  const unmappedCount = columns.filter((c) => c.status === "unmapped").length;

  // 必要字段是否全部已映射
  const mappedRequiredFields = new Set(
    columns.filter((c) => c.status === "confirmed" && c.mappedField).map((c) => c.mappedField)
  );
  const missingRequired = [...REQUIRED_FIELDS].filter((code) => !mappedRequiredFields.has(code));

  // ── 映射操作（带撤消栈记录） ──
  const applyMapping = useCallback(
    (colIndex: number, newField: string | null, newStatus: MappedColumn["status"]) => {
      setColumns((prev) =>
        prev.map((c) => {
          if (c.colIndex !== colIndex) return c;
          const action: MappingAction = {
            colIndex,
            prevField: c.mappedField,
            prevStatus: c.status,
            newField,
            newStatus,
          };
          setUndoStack((stack) => [...stack, action]);
          setRedoStack([]); // 新操作清空重做栈
          return { ...c, mappedField: newField, status: newStatus };
        })
      );
    },
    []
  );

  // 确认一条推荐
  const confirmMapping = useCallback(
    (colIndex: number, fieldCode: string) => {
      applyMapping(colIndex, fieldCode, "confirmed");
      toast.success(`已确认：${columns.find((c) => c.colIndex === colIndex)?.colName} → ${FIELD_MAP.get(fieldCode)}`);
    },
    [applyMapping, columns]
  );

  // 修改映射
  const changeMapping = useCallback(
    (colIndex: number, newFieldCode: string) => {
      applyMapping(colIndex, newFieldCode, "confirmed");
      setEditingCol(null);
      toast.success(`已修改映射`);
    },
    [applyMapping]
  );

  // 标记忽略
  const ignoreField = useCallback(
    (colIndex: number) => {
      applyMapping(colIndex, null, "ignored");
    },
    [applyMapping]
  );

  // 撤消
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const action = undoStack[undoStack.length - 1];
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [...stack, action]);
    setColumns((prev) =>
      prev.map((c) =>
        c.colIndex === action.colIndex
          ? { ...c, mappedField: action.prevField, status: action.prevStatus }
          : c
      )
    );
    toast("已撤消");
  }, [undoStack]);

  // 重做
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const action = redoStack[redoStack.length - 1];
    setRedoStack((stack) => stack.slice(0, -1));
    setUndoStack((stack) => [...stack, action]);
    setColumns((prev) =>
      prev.map((c) =>
        c.colIndex === action.colIndex
          ? { ...c, mappedField: action.newField, status: action.newStatus }
          : c
      )
    );
    toast("已重做");
  }, [redoStack]);

  // ── 批量确认所有推荐 ──
  const confirmAll = useCallback(() => {
    columns
      .filter((c) => c.status === "recommended" && c.mappedField)
      .forEach((c) => confirmMapping(c.colIndex, c.mappedField!));
  }, [columns, confirmMapping]);

  // ── 提交触发诊断 ──
  const handleSubmit = async () => {
    if (missingRequired.length > 0) {
      toast.error(
        `还有 ${missingRequired.length} 个必要字段未映射：${missingRequired.map((c) => FIELD_MAP.get(c)).join("、")}`
      );
      return;
    }
    setIsSubmitting(true);
    try {
      // TODO: POST /api/v1/tasks/:id/confirm → 触发异步诊断
      await new Promise((r) => setTimeout(r, 800));
      toast.success("字段映射已确认！诊断任务已启动");
      router.push("/tasks");
    } catch {
      toast.error("启动诊断失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 渐进式推荐检测 ──
  const hasSeriesPattern = columns.some(
    (c) => c.status === "confirmed" && /\d$/.test(c.colName)
  );

  return (
    <div className="flex h-dvh flex-col bg-zinc-50">
      {/* ── 顶部导航 ── */}
      <div className="flex items-center gap-4 border-b border-zinc-200 bg-white px-6 py-3">
        <Link href="/diagnose/upload">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">字段映射确认</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="px-2.5 py-1 text-xs">1. 上传文件</Badge>
          <span className="text-zinc-300">→</span>
          <Badge variant="default" className="px-2.5 py-1 text-xs">2. 字段映射</Badge>
          <span className="text-zinc-300">→</span>
          <Badge variant="secondary" className="px-2.5 py-1 text-xs">3. 执行诊断</Badge>
        </div>
      </div>

      {/* ── 主内容区 ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-6 space-y-4">
          {/* 统计摘要栏 */}
          <Card className="border-l-4 border-l-zinc-900">
            <CardContent className="flex items-center gap-6 py-4">
              <StatBadge label="已映射" value={confirmedCount} color="bg-green-100 text-green-700" />
              <StatBadge label="待确认" value={recommendedCount} color="bg-amber-100 text-amber-700" />
              <StatBadge label="已忽略" value={ignoredCount} color="bg-zinc-100 text-zinc-500" />
              <StatBadge label="未映射" value={unmappedCount} color="bg-red-50 text-red-600" />
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-zinc-400">共 {totalFields} 个字段</span>
              </div>
            </CardContent>
          </Card>

          {/* 必要字段缺失提醒 */}
          {missingRequired.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  必要字段未完成映射（{missingRequired.length} 个）
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {missingRequired.map((code) => `${code} ${FIELD_MAP.get(code)}`).join("、")}
                  — 全部映射完成后才可执行诊断
                </p>
              </div>
            </div>
          )}

          {/* 渐进式推荐卡片（PRD §5.1.4） */}
          {showSuggestion && hasSeriesPattern && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="flex items-start gap-3 py-4">
                <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">💡 发现规律：序列编号</p>
                  <p className="text-xs text-blue-600 mt-1">
                    检测到您已确认了序列编号的字段映射（如 VDC1→直流电压#1、VDC2→直流电压#2）。
                    系统可以自动推断剩余相似列的映射关系：
                  </p>
                  <div className="mt-2 text-xs text-blue-700 grid grid-cols-2 gap-1">
                    {columns
                      .filter((c) => c.status === "unmapped" && /\d$/.test(c.colName))
                      .map((c) => (
                        <span key={c.colIndex}>{c.colName} → 未映射</span>
                      ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                      onClick={() => { setShowSuggestion(false); toast.info("推荐已忽略"); }}
                    >
                      忽略
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        // 模拟应用渐进式推荐
                        columns
                          .filter((c) => c.status === "unmapped")
                          .forEach((c) => applyMapping(c.colIndex, "D2", "recommended"));
                        setShowSuggestion(false);
                        toast.success("已应用推荐（可通过 Ctrl+Z 撤消）");
                      }}
                    >
                      一键应用
                    </Button>
                  </div>
                </div>
                <button
                  onClick={() => setShowSuggestion(false)}
                  className="text-blue-400 hover:text-blue-600 text-xs"
                >
                  关闭
                </button>
              </CardContent>
            </Card>
          )}

          {/* 映射列表 */}
          <Card>
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">字段映射列表</CardTitle>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger className="inline-flex">
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={undo} disabled={undoStack.length === 0}>
                        <Undo2 className="mr-1 h-3 w-3" />撤消
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Ctrl+Z</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger className="inline-flex">
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={redo} disabled={redoStack.length === 0}>
                        <Redo2 className="mr-1 h-3 w-3" />重做
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Ctrl+Shift+Z</TooltipContent>
                  </Tooltip>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={confirmAll} disabled={recommendedCount === 0}>
                    全部确认
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs text-zinc-500">
                    <th className="px-4 py-2.5 text-left font-medium w-8">#</th>
                    <th className="px-4 py-2.5 text-left font-medium">原始列名</th>
                    <th className="px-4 py-2.5 text-left font-medium hidden md:table-cell">数据预览</th>
                    <th className="px-4 py-2.5 text-left font-medium">映射为</th>
                    <th className="px-4 py-2.5 text-left font-medium w-24 hidden sm:table-cell">置信度</th>
                    <th className="px-4 py-2.5 text-center font-medium w-20">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map((col) => (
                    <tr
                      key={col.colIndex}
                      className={cn(
                        "border-b border-zinc-100 text-sm transition-colors",
                        col.status === "unmapped" && missingRequired.length > 0 && !col.mappedField && "bg-red-50/30"
                      )}
                    >
                      {/* 列序号 */}
                      <td className="px-4 py-3 text-zinc-400 text-xs">{col.colIndex}</td>

                      {/* 原始列名 */}
                      <td className="px-4 py-3">
                        <code className="text-xs bg-zinc-100 rounded px-1.5 py-0.5 text-zinc-700">
                          {col.colName}
                        </code>
                      </td>

                      {/* 数据预览（前3行） */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-zinc-400">
                          {col.sampleValues.join(", ")}
                        </span>
                      </td>

                      {/* 映射字段选择 */}
                      <td className="px-4 py-3">
                        {col.status === "ignored" ? (
                          <span className="text-xs text-zinc-400 italic flex items-center gap-1">
                            <EyeOff className="h-3 w-3" /> 已忽略
                          </span>
                        ) : col.mappedField ? (
                          <Popover
                            open={editingCol === col.colIndex}
                            onOpenChange={(open) => {
                              if (open) {
                                setEditingCol(col.colIndex);
                                setSearchField("");
                              } else {
                                setEditingCol(null);
                              }
                            }}
                          >
                            <PopoverTrigger className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50 transition-colors">
                                <span className="font-medium text-zinc-700">
                                  {col.mappedField}
                                </span>
                                <span className="text-zinc-400 truncate max-w-32">
                                  {FIELD_MAP.get(col.mappedField) ?? col.mappedField}
                                </span>
                                <ChevronDown className="h-3 w-3 text-zinc-400" />
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0" align="start">
                              <div className="p-2 border-b border-zinc-100">
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                                  <Input
                                    placeholder="搜索标准字段..."
                                    value={searchField}
                                    onChange={(e) => setSearchField(e.target.value)}
                                    className="pl-8 h-8 text-xs"
                                    autoFocus
                                  />
                                </div>
                              </div>
                              <div className="max-h-64 overflow-y-auto">
                                {STANDARD_FIELDS.map((group) => {
                                  const filtered = group.fields.filter(
                                    (f) =>
                                      !searchField ||
                                      f.name.toLowerCase().includes(searchField.toLowerCase()) ||
                                      f.code.toLowerCase().includes(searchField.toLowerCase())
                                  );
                                  if (filtered.length === 0) return null;
                                  return (
                                    <div key={group.category}>
                                      <div className="px-3 py-1.5 text-[10px] text-zinc-400 uppercase tracking-wide">
                                        {group.category}
                                      </div>
                                      {filtered.map((field) => (
                                        <button
                                          key={field.code}
                                          onClick={() => {
                                            if (col.mappedField) {
                                              changeMapping(col.colIndex, field.code);
                                            } else {
                                              applyMapping(col.colIndex, field.code, "confirmed");
                                              setEditingCol(null);
                                            }
                                          }}
                                          className={cn(
                                            "flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-zinc-50 transition-colors text-left",
                                            col.mappedField === field.code && "bg-zinc-100 font-medium"
                                          )}
                                        >
                                          <span className="font-mono text-zinc-500 w-7">{field.code}</span>
                                          <span className="flex-1">{field.name}</span>
                                          {field.required && (
                                            <span className="text-red-400 text-[10px]">必要</span>
                                          )}
                                          {col.mappedField === field.code && (
                                            <Check className="h-3 w-3 text-green-600" />
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </td>

                      {/* 置信度 */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {col.confidence > 0 ? (
                          <div className="flex items-center gap-2">
                            <Progress
                              value={col.confidence}
                              className={cn("h-1.5 w-12", getConfidenceColor(col.confidence))}
                            />
                            <span className="text-xs text-zinc-500">{col.confidence}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </td>

                      {/* 状态 + 操作 */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {col.status === "recommended" ? (
                            <>
                              <ConfidenceBadge score={col.confidence} />
                              <Tooltip>
                                <TooltipTrigger
                                  onClick={() => col.mappedField && confirmMapping(col.colIndex, col.mappedField)}
                                  className="rounded p-1 text-green-500 hover:bg-green-50"
                                >
                                    <Check className="h-3.5 w-3.5" />
                                </TooltipTrigger>
                                <TooltipContent>确认此映射</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger
                                  onClick={() => setEditingCol(col.colIndex)}
                                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </TooltipTrigger>
                                <TooltipContent>修改映射</TooltipContent>
                              </Tooltip>
                            </>
                          ) : col.status === "confirmed" ? (
                            <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">
                              <Check className="mr-0.5 h-2.5 w-2.5" />已确认
                            </Badge>
                          ) : col.status === "ignored" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-zinc-400 hover:text-zinc-600"
                              onClick={() => setEditingCol(col.colIndex)}
                            >
                              重新映射
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-zinc-500"
                                onClick={() => setEditingCol(col.colIndex)}
                              >
                                映射
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-zinc-400"
                                onClick={() => ignoreField(col.colIndex)}
                              >
                                忽略
                              </Button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* 缺失字段清单 */}
          {missingRequired.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  必要字段缺失清单
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {missingRequired.map((code) => (
                    <Badge key={code} variant="outline" className="text-red-600 border-red-200 bg-red-50">
                      {code}: {FIELD_MAP.get(code)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── 底部操作栏 ── */}
      <div className="flex items-center justify-between border-t border-zinc-200 bg-white px-6 py-3">
        <p className="text-xs text-zinc-400">
          AI识别结果均为推荐，需您逐项确认。已确认的映射将保存并用于提升后续推荐的准确度（PRD §5.1.6）
        </p>
        <div className="flex items-center gap-3">
          <Link href="/diagnose/upload">
            <Button variant="outline">返回</Button>
          </Link>
          <Button
            onClick={handleSubmit}
            disabled={missingRequired.length > 0 || isSubmitting}
          >
            {isSubmitting ? "正在提交..." : "确认全部映射，开始诊断"}
          </Button>
          {missingRequired.length > 0 && (
            <p className="text-xs text-red-500">
              缺失 {missingRequired.length} 个必要字段，[开始诊断] 已禁用
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 辅助组件 ──

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", color)}>
        {value}
      </span>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  const { label, color } = getConfidenceBadge(score);
  return (
    <Badge className={cn("text-[10px] px-1.5", color)}>
      {label} {score}%
    </Badge>
  );
}
