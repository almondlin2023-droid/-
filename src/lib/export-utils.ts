/**
 * 报告导出工具模块
 *
 * PRD §5.3 诊断报告输出：支持 PDF/Excel 双模态导出。
 * V1 阶段前端侧实现 CSV/JSON 导出和浏览器打印方案，
 * 后续对接后端 weasyprint+openpyxl 的正式 PDF/Excel 生成。
 */

// ── JSON → CSV 转换 ──
export function jsonToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const escape = (v: unknown): string => {
    const s = v == null ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = [headers.join(","), ...data.map((row) => headers.map((h) => escape(row[h])).join(","))];
  return rows.join("\n");
}

// ── 下载文件 ──
export function downloadFile(content: string, filename: string, mimeType: string) {
  const bom = "﻿"; // BOM for Excel UTF-8 compatibility
  const blob = new Blob([bom + content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── 导出 Excel（CSV 格式，可用 Excel 打开） ──
export function exportExcel(filename: string, sheets: Record<string, Record<string, unknown>[]>) {
  // 多 sheet 模拟：每个 sheet 之间用空行 + sheet 名分隔
  const parts: string[] = [];
  for (const [sheetName, rows] of Object.entries(sheets)) {
    parts.push(`# ${sheetName}`);
    parts.push(jsonToCSV(rows));
  }
  downloadFile(parts.join("\n\n"), `${filename}.csv`, "text/csv");
}

// ── 导出 PDF（V1：浏览器打印方案） ──
export function exportPDF(title: string) {
  const originalTitle = document.title;
  document.title = title;
  window.print();
  document.title = originalTitle;
}

// ── 导出 JSON（原始数据） ──
export function exportJSON(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, `${filename}.json`, "application/json");
}

// ── 报告数据 → CSV 导出 ──
export interface ReportExportData {
  stationName: string;
  reportNumber: string;
  prSummary: { label: string; value: string }[];
  losses: { label: string; lossRate: string; lossKwh: string; category: string }[];
  monthlyPR: { month: string; prActual: string; prBaseline: string; prDeviation: string }[];
  dataQuality: { param: string; value: string; status: string }[];
  faults: { device: string; type: string; duration: string; lossKwh: string }[];
  offlineEvents: { logger: string; hours: string; count: string; dates: string }[];
}

export function exportReportData(data: ReportExportData) {
  const filename = data.reportNumber || "report";
  exportExcel(filename, {
    "核心指标": data.prSummary.map((i) => ({ 指标: i.label, 数值: i.value })),
    "损失分解": data.losses.map((l) => ({ 损失项: l.label, 损失率: l.lossRate, 损失电量: l.lossKwh, 类别: l.category })),
    "月度PR": data.monthlyPR.map((m) => ({ 月份: m.month, 实际PR: m.prActual, 基准PR: m.prBaseline, PR偏差: m.prDeviation })),
    "数据质量": data.dataQuality.map((d) => ({ 参数: d.param, 数值: d.value, 状态: d.status })),
    "故障事件": data.faults.map((f) => ({ 设备: f.device, 故障类型: f.type, 持续时长: f.duration, 损失电量: f.lossKwh })),
    "离线事件": data.offlineEvents.map((o) => ({ 采集器: o.logger, 离线时长: o.hours, 离线次数: o.count, 日期: o.dates })),
  });
}
