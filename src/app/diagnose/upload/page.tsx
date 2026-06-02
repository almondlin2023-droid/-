"use client";

/**
 * 诊断流程 — 数据文件上传页
 *
 * PRD §5.1 阶段一：文件上传后系统自动解析并执行 AI 首轮字段推荐。
 * PRD §4.4 重复诊断路径：已有电站可选择诊断范围后再上传。
 *
 * 流程：
 *   1. 选择诊断范围（新建电站 或 选择已有电站 + 子场站）
 *   2. 拖拽上传逆变器导出文件（支持 CSV/Excel/XML/JSON）
 *   3. 系统解析文件 → AI 字段识别 → 跳转到映射确认页
 */

import { useState, useCallback, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  FileText,
  FileCode,
  FileJson,
  CheckCircle2,
  Building2,
  Plus,
  Zap,
  Clock,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useStations } from "@/lib/data-hooks";
import type { Station } from "@/types/diagnosis";

// ── 支持的文件格式（PRD §5.1.7） ──
const ACCEPTED_FORMATS = {
  "text/csv": [".csv"],
  "text/tab-separated-values": [".tsv"],
  "text/plain": [".txt"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "text/xml": [".xml"],
  "application/json": [".json"],
};

const FORMAT_LABELS: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  csv: { icon: FileSpreadsheet, label: "CSV", color: "bg-green-100 text-green-700" },
  tsv: { icon: FileSpreadsheet, label: "TSV", color: "bg-green-100 text-green-700" },
  txt: { icon: FileText, label: "TXT", color: "bg-zinc-100 text-zinc-700" },
  xlsx: { icon: FileSpreadsheet, label: "Excel", color: "bg-emerald-100 text-emerald-700" },
  xls: { icon: FileSpreadsheet, label: "Excel", color: "bg-emerald-100 text-emerald-700" },
  xml: { icon: FileCode, label: "XML", color: "bg-blue-100 text-blue-700" },
  json: { icon: FileJson, label: "JSON", color: "bg-amber-100 text-amber-700" },
};

// 文件扩展名 → 格式 key
function getFormatKey(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return ext;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  format: string;
  status: "pending" | "uploading" | "parsing" | "ready" | "error";
  progress: number;
  error?: string;
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><p className="text-sm text-zinc-500">加载中...</p></div>}>
      <UploadPageInner />
    </Suspense>
  );
}

function UploadPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedStationId = searchParams.get("station_id");
  const { data: stations } = useStations();

  // ── 状态 ──
  const [stationId, setStationId] = useState<string>(preselectedStationId ?? "new");
  const [subStationIds, setSubStationIds] = useState<string[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── 文件拖拽区域事件 ──
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(Array.from(e.target.files));
      }
    },
    []
  );

  // ── 文件添加与解析模拟 ──
  const addFiles = useCallback((newFiles: File[]) => {
    const added: UploadedFile[] = newFiles.map((f) => ({
      id: `f-${Math.random().toString(36).slice(2, 8)}`,
      name: f.name,
      size: f.size,
      format: getFormatKey(f.name),
      status: "pending" as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...added]);

    // 模拟上传→解析流程
    added.forEach((uf) => {
      simulateUpload(uf.id);
    });
  }, []);

  /** 模拟文件上传 + AI 解析过程 */
  const simulateUpload = (fileId: string) => {
    // 模拟上传进度
    let progress = 0;
    const uploadInterval = setInterval(() => {
      progress += 20;
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, status: "uploading", progress: Math.min(progress, 100) } : f))
      );
      if (progress >= 100) {
        clearInterval(uploadInterval);
        // 进入解析阶段
        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, status: "parsing", progress: 100 } : f))
        );
        // 模拟解析延迟后完成
        setTimeout(() => {
          setFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, status: "ready", progress: 100 } : f))
          );
        }, 1200);
      }
    }, 200);
  };

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  // ── 判断是否可以进入下一步 ──
  const canProceed = files.length > 0 && files.every((f) => f.status === "ready");

  const handleNext = () => {
    if (!canProceed) return;
    // 跳转到字段映射页
    const fileIds = files.map((f) => f.id).join(",");
    router.push(
      `/diagnose/mapping?station_id=${stationId}&sub_ids=${subStationIds.join(",")}&files=${fileIds}`
    );
  };

  // ── 格式化文件大小 ──
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex h-dvh flex-col bg-zinc-50">
      {/* ── 顶部导航 ── */}
      <div className="flex items-center gap-4 border-b border-zinc-200 bg-white px-6 py-3">
        <Link href="/stations">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">新建诊断 — 上传数据文件</h1>
        </div>
        {/* 步骤指示器 */}
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="default" className="px-2.5 py-1 text-xs">1. 上传文件</Badge>
          <span className="text-zinc-300">→</span>
          <Badge variant="secondary" className="px-2.5 py-1 text-xs">2. 字段映射</Badge>
          <span className="text-zinc-300">→</span>
          <Badge variant="secondary" className="px-2.5 py-1 text-xs">3. 执行诊断</Badge>
        </div>
      </div>

      {/* ── 主内容区 ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
          {/* ── 步骤1：选择诊断范围 ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-zinc-500" />
                选择诊断范围
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="选择电站">
                  <Select value={stationId} onValueChange={(v) => setStationId(v ?? "new")}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择已有电站" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">
                        <span className="flex items-center gap-2">
                          <Plus className="h-3.5 w-3.5" />
                          新建电站（诊断后保存）
                        </span>
                      </SelectItem>
                      <Separator />
                      {(stations ?? []).map((s: Station) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                {/* 已选电站时显示子场站选择 */}
                {stationId !== "new" && (
                  <FormField label="诊断子场站（不选则全站诊断）">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="全部子场站" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部子场站</SelectItem>
                        <SelectItem value="sub-001">屋顶A区</SelectItem>
                        <SelectItem value="sub-002">屋顶B区</SelectItem>
                        <SelectItem value="sub-003">南坡阵列</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                )}
              </div>
              {stationId === "new" && (
                <p className="text-xs text-zinc-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  选择&ldquo;新建电站&rdquo;将在诊断完成后自动创建电站实体（PRD §4.3 诊断驱动创建）
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── 步骤2：上传数据文件 ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4 text-zinc-500" />
                上传逆变器导出文件
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 拖拽上传区域 */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors",
                  isDragging
                    ? "border-zinc-900 bg-zinc-100"
                    : "border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50"
                )}
              >
                <Upload className={cn("h-10 w-10 mb-3", isDragging ? "text-zinc-700" : "text-zinc-400")} />
                <p className="text-sm font-medium text-zinc-700">
                  拖拽文件到这里，或<span className="text-zinc-900 underline">点击选择</span>
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  支持 CSV、Excel (.xlsx/.xls)、TXT、XML、JSON 格式（PRD §5.1.7）
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  单文件最大 100MB，编码自动检测（UTF-8/GBK/GB2312等）
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".csv,.tsv,.txt,.xlsx,.xls,.xml,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* 已上传文件列表 */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file) => {
                    const fmt = FORMAT_LABELS[file.format] ?? FORMAT_LABELS.txt;
                    const FormatIcon = fmt.icon;
                    return (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3"
                      >
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-md", fmt.color)}>
                          <FormatIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-zinc-800 truncate">
                              {file.name}
                            </span>
                            <Badge className={cn("text-[10px] px-1.5", fmt.color)}>
                              {fmt.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-zinc-400">
                              {formatSize(file.size)}
                            </span>
                            {file.status === "uploading" && (
                              <>
                                <Progress value={file.progress} className="h-1 w-20" />
                                <span className="text-xs text-blue-500">上传中...</span>
                              </>
                            )}
                            {file.status === "parsing" && (
                              <span className="text-xs text-amber-500 flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                AI 正在解析字段...
                              </span>
                            )}
                            {file.status === "ready" && (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />解析完成
                              </span>
                            )}
                            {file.status === "error" && (
                              <span className="text-xs text-red-500">{file.error}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(file.id)}
                          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── 支持的格式速查 ── */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(FORMAT_LABELS).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <div
                  key={key}
                  className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]", cfg.color)}
                >
                  <Icon className="h-3 w-3" />
                  {cfg.label}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 底部操作栏 ── */}
      <div className="flex items-center justify-between border-t border-zinc-200 bg-white px-6 py-3">
        <p className="text-xs text-zinc-400">
          {files.length === 0
            ? "请上传至少一个逆变器导出数据文件"
            : `${files.filter((f) => f.status === "ready").length}/${files.length} 个文件已就绪`}
        </p>
        <div className="flex items-center gap-3">
          <Link href="/stations">
            <Button variant="outline">取消</Button>
          </Link>
          <Button onClick={handleNext} disabled={!canProceed}>
            {canProceed ? "下一步：字段映射" : "等待文件解析完成..."}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-zinc-600">{label}</Label>
      {children}
    </div>
  );
}
