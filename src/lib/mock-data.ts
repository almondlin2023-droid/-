/**
 * 共享模拟数据模块
 *
 * 集中管理所有 API 路由和前端页面共用的模拟数据。
 * 对接真实后端时，删除此文件并将 API 路由改为 fetch 调用即可。
 *
 * 数据结构与 Supabase 表定义严格一致（技术架构 §3.1）。
 */

import type { Station, SubStation, Task, DiagnosisLoss, FaultEvent } from "@/types/diagnosis";

// ============================================================
// 电站 (PRD §4.1)
// ============================================================
export const MOCK_STATIONS: Station[] = [
  {
    id: "st-001", owner_id: "user-1", name: "西郊分布式光伏电站",
    longitude: 120.1234, latitude: 31.5678, timezone: "Asia/Shanghai",
    resource_zone: "III", grid_conn_date: "2023-06-15",
    grid_voltage: 10, feed_in_price: 0.391,
    module_type: "单晶", module_model: "LR5-72HPH-545M", module_power: 545,
    temp_coeff: -0.0035, status: "active",
    created_at: "2024-01-15T08:00:00Z", updated_at: "2025-03-20T10:30:00Z",
  },
  {
    id: "st-002", owner_id: "user-1", name: "东部开发区屋顶光伏",
    longitude: 121.5678, latitude: 31.2345, timezone: "Asia/Shanghai",
    resource_zone: "III", grid_conn_date: "2024-03-01",
    grid_voltage: 10, feed_in_price: 0.415,
    module_type: "多晶", module_model: "JKM550M-72HL4", module_power: 550,
    temp_coeff: -0.0037, status: "active",
    created_at: "2024-03-01T08:00:00Z", updated_at: "2025-02-10T14:00:00Z",
  },
  {
    id: "st-003", owner_id: "user-1", name: "南部工业园区光伏",
    longitude: 113.4567, latitude: 23.1234, timezone: "Asia/Shanghai",
    resource_zone: "IV", grid_conn_date: "2022-09-01",
    grid_voltage: 35, feed_in_price: 0.453,
    module_type: "单晶", module_model: "LR5-72HPH-545M", module_power: 545,
    temp_coeff: -0.0035, status: "archived",
    created_at: "2022-09-01T08:00:00Z", updated_at: "2024-12-01T10:00:00Z",
  },
];

// ============================================================
// 子场站 (PRD §3.1.2)
// ============================================================
export const MOCK_SUB_STATIONS: Record<string, SubStation[]> = {
  "st-001": [
    { id: "sub-001", station_id: "st-001", name: "屋顶A区", dc_capacity: 200, tilt_angle: 30, azimuth: 180, string_series: 20, string_parallel: 5, inv_brand: "华为", inv_model: "SUN2000-100KTL", inv_ac_power: 100, inv_count: 2, mppt_count: 10, strings_per_mppt: 2, inv_sn_list: ["SN-20230101", "SN-20230102"], sort_order: 0 },
    { id: "sub-002", station_id: "st-001", name: "屋顶B区", dc_capacity: 150, tilt_angle: 15, azimuth: 150, string_series: 18, string_parallel: 4, inv_brand: "华为", inv_model: "SUN2000-100KTL", inv_ac_power: 100, inv_count: 2, mppt_count: 8, strings_per_mppt: 2, inv_sn_list: ["SN-20230103", "SN-20230104"], sort_order: 1 },
    { id: "sub-003", station_id: "st-001", name: "南坡阵列", dc_capacity: 180, tilt_angle: 25, azimuth: 210, string_series: 22, string_parallel: 4, inv_brand: "阳光电源", inv_model: "SG100CX", inv_ac_power: 100, inv_count: 2, mppt_count: 9, strings_per_mppt: 2, inv_sn_list: ["SN-20230105", "SN-20230106"], sort_order: 2 },
  ],
  "st-002": [
    { id: "sub-004", station_id: "st-002", name: "A栋屋顶", dc_capacity: 250, tilt_angle: 20, azimuth: 170, string_series: 24, string_parallel: 5, inv_brand: "固德威", inv_model: "GW100K-HT", inv_ac_power: 100, inv_count: 3, mppt_count: 10, strings_per_mppt: 2, inv_sn_list: ["SN-20230201", "SN-20230202", "SN-20230203"], sort_order: 0 },
  ],
};

// ============================================================
// 诊断任务 (PRD §4.2)
// ============================================================
export interface MockTask extends Task {
  stationName: string;
  pr?: number;
  issues?: number;
  equivalentHours?: number;
  files?: MockFile[];
  mappingsCount?: number;
  losses?: MockLossItem[];
}

export interface MockFile {
  id: string; name: string; size: number; rowCount: number;
  timeStart: string; timeEnd: string; encoding: string;
}

export interface MockLossItem {
  key: string; label: string; lossRate: number; lossKwh: number; diagnosed: boolean;
}

export const MOCK_TASKS: Record<string, MockTask> = {
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
    mappingsCount: 18,
  },
  "task-004": {
    id: "task-004", station_id: "st-001", owner_id: "user-1",
    status: "completed", stationName: "西郊分布式光伏电站",
    scope: { sub_station_ids: ["sub-001", "sub-002", "sub-003"], date_range: { start: "2025-03-01", end: "2025-03-15" } },
    summary: { pr_actual: 85.2, pr_baseline: 73.38, pr_deviation: 11.82, energy_actual_kwh: 102300, energy_baseline_kwh: 88100, energy_deviation_kwh: 14200, revenue_actual: 39999, revenue_baseline: 34445, revenue_deviation: 5554 },
    report_number: "PVAI20250315103000001",
    created_at: "2025-03-15T10:30:00Z", completed_at: "2025-03-15T10:32:00Z",
    pr: 85.2, issues: 1, equivalentHours: 92,
    files: [
      { id: "f-201", name: "INV_A_20250301-0315.csv", size: 4200000, rowCount: 4320, timeStart: "2025-03-01T00:00:00Z", timeEnd: "2025-03-15T23:55:00Z", encoding: "UTF-8" },
      { id: "f-202", name: "INV_B_20250301-0315.csv", size: 4100000, rowCount: 4320, timeStart: "2025-03-01T00:00:00Z", timeEnd: "2025-03-15T23:55:00Z", encoding: "UTF-8" },
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
    pr: 79.5, issues: 3, equivalentHours: 78,
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
  "task-001": {
    id: "task-001", station_id: "st-001", owner_id: "user-1",
    status: "completed", stationName: "西郊分布式光伏电站",
    scope: { sub_station_ids: ["sub-001", "sub-002"], date_range: { start: "2025-01-01", end: "2025-01-05" } },
    summary: { pr_actual: 78.4, pr_baseline: 66.0, pr_deviation: 12.4, energy_actual_kwh: 92000, energy_baseline_kwh: 77500, energy_deviation_kwh: 14500, revenue_actual: 35972, revenue_baseline: 30303, revenue_deviation: 5669 },
    report_number: "PVAI20250105160000001",
    created_at: "2025-01-05T16:00:00Z", completed_at: "2025-01-05T16:03:00Z",
    pr: 78.4, issues: 5, equivalentHours: 84,
    files: [{ id: "f-501", name: "INV_20250101-0105.csv", size: 3500000, rowCount: 1440, timeStart: "2025-01-01T00:00:00Z", timeEnd: "2025-01-05T23:55:00Z", encoding: "UTF-8" }],
    mappingsCount: 18,
    losses: [
      { key: "fault_string", label: "掉串损失", lossRate: 4.2, lossKwh: 3864, diagnosed: true },
      { key: "shadow", label: "阴影损失", lossRate: 3.8, lossKwh: 3496, diagnosed: true },
      { key: "soiling", label: "灰尘损失", lossRate: 2.9, lossKwh: 2668, diagnosed: false },
    ],
  },
};

/** 任务列表（有序数组） */
export function getTasksList(stationId?: string): MockTask[] {
  const tasks = Object.values(MOCK_TASKS);
  const filtered = stationId ? tasks.filter((t) => t.station_id === stationId) : tasks;
  return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// ============================================================
// 诊断损失 (PRD §5.3.6)
// ============================================================
export const MOCK_DIAGNOSIS_LOSSES: Record<string, DiagnosisLoss[]> = {
  "task-004": [
    {
      id: "loss-001", task_id: "task-004", sub_station_id: "sub-001", loss_month: "2025-03",
      pr_actual: 85.2, pr_baseline: 73.38, pr_deviation: 11.82,
      grid_loss: -0.34, shutdown_loss: 0, over_under_volt_loss: 0,
      shadow_loss: -0.18, clipping_loss: 0, soiling_loss: -0.1, string_loss: -0.01, other_loss: -1.12,
      grid_loss_kwh: 348, shutdown_loss_kwh: 0, over_under_volt_loss_kwh: 0,
      shadow_loss_kwh: 184, clipping_loss_kwh: 0, soiling_loss_kwh: 102, string_loss_kwh: 10,
    },
    {
      id: "loss-002", task_id: "task-004", sub_station_id: "sub-002", loss_month: "2025-03",
      pr_actual: 84.1, pr_baseline: 72.5, pr_deviation: 11.6,
      grid_loss: -0.22, shutdown_loss: 0, over_under_volt_loss: 0,
      shadow_loss: -0.37, clipping_loss: -0.05, soiling_loss: -0.08, string_loss: 0, other_loss: -0.95,
      grid_loss_kwh: 225, shutdown_loss_kwh: 0, over_under_volt_loss_kwh: 0,
      shadow_loss_kwh: 379, clipping_loss_kwh: 51, soiling_loss_kwh: 82, string_loss_kwh: 0,
    },
  ],
};

// ============================================================
// 故障事件 (PRD §5.3.6)
// ============================================================
export const MOCK_FAULT_EVENTS: Record<string, FaultEvent[]> = {
  "task-004": [
    {
      id: "fault-001", task_id: "task-004", sub_station_id: "sub-001",
      fault_type: "grid_loss", device_sn: "SN-20230101", component_capacity: 200,
      start_time: "2025-03-02T03:15:00Z", end_time: "2025-03-02T06:40:00Z",
      duration_h: 3.4, loss_kwh: 200, example_date: "2025-03-02",
    },
    {
      id: "fault-002", task_id: "task-004", sub_station_id: "sub-001",
      fault_type: "grid_loss", device_sn: "SN-20230102", component_capacity: 200,
      start_time: "2025-03-08T12:00:00Z", end_time: "2025-03-08T14:30:00Z",
      duration_h: 2.5, loss_kwh: 148, example_date: "2025-03-08",
    },
    {
      id: "fault-003", task_id: "task-004", sub_station_id: "sub-002",
      fault_type: "shadow", device_sn: "子场站B区", component_capacity: 150,
      start_time: "2025-03-01T09:00:00Z", end_time: "2025-03-15T10:30:00Z",
      duration_h: 22.5, loss_kwh: 92,
    },
    {
      id: "fault-004", task_id: "task-004", sub_station_id: "sub-003",
      fault_type: "string_outage", device_sn: "MPPT#3", component_capacity: 180,
      start_time: "2025-03-05T00:00:00Z", end_time: "2025-03-05T08:00:00Z",
      duration_h: 8, loss_kwh: 10, example_date: "2025-03-05",
    },
  ],
};

// ============================================================
// 离线事件 (PRD §5.3.7)
// ============================================================
export const MOCK_OFFLINE_EVENTS = {
  "task-004": [
    { id: "off-001", task_id: "task-004", logger_sn: "采集器-SN20230101", inverter_sn: "SN-20230101", offline_hours: 2.5, offline_count: 2, example_dates: ["2025-03-05", "2025-03-08"] },
    { id: "off-002", task_id: "task-004", logger_sn: "采集器-SN20230105", inverter_sn: "SN-20230103", offline_hours: 1.0, offline_count: 1, example_dates: ["2025-03-12"] },
  ],
};

// ============================================================
// 报告完整数据 (PRD §5.3)
// ============================================================
export const MOCK_REPORT_FULL = {
  "task-004": {
    id: "task-004",
    stationName: "西郊分布式光伏电站",
    stationId: "st-001",
    reportNumber: "PVAI20250315103000001",
    createdAt: "2025-03-15T10:30:00Z",
    dataRange: { start: "2025-03-01", end: "2025-03-15" },
    feedInPrice: 0.391,
    summary: {
      pr_actual: 85.2, pr_baseline: 73.38, pr_deviation: 11.82,
      energy_actual_kwh: 102300, energy_baseline_kwh: 88100, energy_deviation_kwh: 14200,
      revenue_actual: 39999, revenue_baseline: 34445, revenue_deviation: 5554,
    },
    stationParams: {
      longitude: 120.1234, latitude: 31.5678, timezone: "Asia/Shanghai",
      resourceZone: "III", gridConnDate: "2023-06-15",
      moduleType: "单晶", moduleModel: "LR5-72HPH-545M", modulePower: 545,
      subStationCount: 3, totalDcCapacity: 530, totalAcCapacity: 460,
    },
    dataQuality: {
      totalRows: 4321, validRows: 4280, missingRate: 0.95,
      timeCoverage: "100%", avgIntervalMin: 5, encoding: "UTF-8",
      delimiter: ",", fileCount: 3,
    },
    monthlyFullLoadHours: [
      { month: "2025-01", actual: 84, baseline: 78 },
      { month: "2025-02", actual: 89, baseline: 80 },
      { month: "2025-03", actual: 92, baseline: 75 },
    ],
    monthlyPRTable: [
      { month: "2025-01", prActual: 78.40, prBaseline: 66.00, prDeviation: 12.40, gridLoss: -0.22, shutdownLoss: 0, overUnderVoltLoss: 0, shadowLoss: -0.01, clippingLoss: 0, soilingLoss: -0.03, stringLoss: 0, otherLoss: 12.66 },
      { month: "2025-02", prActual: 82.10, prBaseline: 70.47, prDeviation: 11.63, gridLoss: -0.76, shutdownLoss: 0, overUnderVoltLoss: 0, shadowLoss: -0.02, clippingLoss: 0, soilingLoss: -0.04, stringLoss: 0, otherLoss: 12.45 },
      { month: "2025-03", prActual: 85.20, prBaseline: 73.38, prDeviation: 11.82, gridLoss: -0.34, shutdownLoss: 0, overUnderVoltLoss: 0, shadowLoss: -0.18, clippingLoss: 0, soilingLoss: -0.10, stringLoss: -0.01, otherLoss: 12.45 },
    ],
    lossBreakdown: [
      { key: "grid_loss", label: "脱网损失", prLoss: -0.34, kwhLoss: 348, suggestion: "建议与电工沟通尽快恢复并网；检查国网并网线和变压器连接状态" },
      { key: "shadow_loss", label: "阴影损失", prLoss: -0.18, kwhLoss: 184, suggestion: "建议现场排查遮挡源（周边建筑、树木）；调整组件间距或修剪遮挡植被" },
      { key: "soiling_loss", label: "灰尘损失", prLoss: -0.10, kwhLoss: 102, suggestion: "建议安排组件清洗；3月份PM2.5均值偏高（62μg/m³）" },
      { key: "string_loss", label: "掉串损失", prLoss: -0.01, kwhLoss: 10, suggestion: "现场检查对应组串MC4接头和保险丝；排查动物咬损" },
    ],
    offlineEvents: [
      { loggerSn: "采集器-SN20230101", inverterSn: "SN-20230101", offlineHours: 2.5, offlineCount: 2, exampleDates: ["2025-03-05", "2025-03-08"] },
      { loggerSn: "采集器-SN20230105", inverterSn: "SN-20230103", offlineHours: 1.0, offlineCount: 1, exampleDates: ["2025-03-12"] },
    ],
    waterfall: [
      { key: "theory", label: "理论发电量", value: 100, isLoss: false },
      { key: "grid_loss", label: "脱网损失", value: 0.34, isLoss: true },
      { key: "shadow_loss", label: "阴影损失", value: 0.18, isLoss: true },
      { key: "soiling_loss", label: "灰尘损失", value: 0.10, isLoss: true },
      { key: "string_loss", label: "掉串损失", value: 0.01, isLoss: true },
      { key: "other", label: "其他损失", value: 14.10, isLoss: false },
      { key: "actual", label: "实际发电量", value: 85.27, isLoss: false },
    ],
  },
};

// ============================================================
// AI 字段映射建议 (PRD §5.1.2)
// ============================================================
export const MOCK_AI_FIELD_SUGGESTIONS = {
  columns: [
    { colIndex: 0, colName: "SN", mappedField: "D0", confidence: 98, reasoning: "列名为'设备序列号'的常见缩写，值域为13位字符串" },
    { colIndex: 1, colName: "时间", mappedField: "D1", confidence: 97, reasoning: "中文'时间'是时间戳字段的标准命名" },
    { colIndex: 2, colName: "VDC1", mappedField: "D2", confidence: 92, reasoning: "VDC代表直流电压(DC Voltage)，后缀1表示第1路MPPT" },
    { colIndex: 3, colName: "IDC1", mappedField: "D3", confidence: 90, reasoning: "IDC代表直流电流(DC Current)，与VDC1配对出现" },
    { colIndex: 4, colName: "VAC", mappedField: "D4", confidence: 88, reasoning: "VAC为交流电压标准缩写" },
    { colIndex: 5, colName: "IAC", mappedField: "D5", confidence: 88, reasoning: "IAC为交流电流标准缩写" },
    { colIndex: 6, colName: "PAC", mappedField: "D6", confidence: 95, reasoning: "PAC为有功功率标准缩写，值域0-110kW" },
    { colIndex: 7, colName: "PF", mappedField: "D8", confidence: 85, reasoning: "PF是功率因数(Power Factor)的行业标准缩写" },
    { colIndex: 8, colName: "Eday", mappedField: "D9", confidence: 91, reasoning: "Eday代表每日发电量(Energy per Day)" },
    { colIndex: 9, colName: "Etotal", mappedField: "D10", confidence: 86, reasoning: "Etotal代表累计发电量，值单调递增" },
    { colIndex: 10, colName: "运行时间", mappedField: "D11", confidence: 83, reasoning: "中文'运行时间'对应工作时长字段" },
    { colIndex: 11, colName: "温度", mappedField: "D12", confidence: 72, reasoning: "简写的'温度'可能为逆变器内部温度，置信度较低" },
    { colIndex: 12, colName: "VDC2", mappedField: "D2", confidence: 80, reasoning: "与VDC1对称，属于第2路MPPT的直流电压" },
    { colIndex: 13, colName: "IDC2", mappedField: "D3", confidence: 80, reasoning: "与IDC1对称，属于第2路MPPT的直流电流" },
    { colIndex: 14, colName: "YGFGL", mappedField: "D6", confidence: 66, reasoning: "拼音缩写，推测为'有功功率'的首字母" },
    { colIndex: 15, colName: "?列16", mappedField: "", confidence: 30, reasoning: "无法从列名推断含义，需用户手动确认" },
  ],
};

export const MOCK_AI_PROGRESSIVE_SUGGESTIONS = {
  detectedPattern: "triple_repeat",
  patternDescription: "检测到列13-15为VDC2/IDC2/YGFGL疑似第2路MPPT的有功功率，与列2-3(VDC1/IDC1)构成对称结构",
  suggestions: [
    { colIndex: 12, suggestedField: "D2", confidence: 80, basis: "与已确认的VDC1配对" },
    { colIndex: 13, suggestedField: "D3", confidence: 80, basis: "与已确认的IDC1配对" },
    { colIndex: 14, suggestedField: "D6", confidence: 66, basis: "与PAC位置对称，且YGFGL为'有功功率'拼音" },
  ],
};
