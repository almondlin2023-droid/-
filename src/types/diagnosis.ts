// ============================================================
// 共享类型定义 — 与后端 FastAPI Pydantic models 保持一致
// ============================================================

// 电站级公共参数 (PRD §3.1.1)
export interface Station {
  id: string;
  owner_id: string;
  name: string;
  longitude: number;
  latitude: number;
  timezone: string;
  resource_zone: "I" | "II" | "III" | "IV";
  grid_conn_date?: string;
  grid_voltage?: number;
  feed_in_price?: number;
  module_type: string;
  module_model?: string;
  module_power: number;
  temp_coeff?: number;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

// 子场站参数 (PRD §3.1.2)
export interface SubStation {
  id: string;
  station_id: string;
  name: string;
  dc_capacity: number; // kWp
  tilt_angle: number;
  azimuth: number;
  string_series: number;
  string_parallel?: number;
  inv_brand?: string;
  inv_model?: string;
  inv_ac_power: number;
  inv_count: number;
  mppt_count?: number;
  strings_per_mppt?: number;
  inv_sn_list?: string[];
  sort_order: number;
}

// 诊断任务 (PRD §4.2)
export interface Task {
  id: string;
  station_id: string;
  owner_id: string;
  status: "pending" | "analyzing" | "completed" | "failed";
  scope: TaskScope;
  data_start?: string;
  data_end?: string;
  summary?: TaskSummary;
  report_number?: string;
  user_feedback?: UserFeedback;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface TaskScope {
  sub_station_ids: string[];
  date_range: { start: string; end: string };
}

export interface TaskSummary {
  pr_actual: number;
  pr_baseline: number;
  pr_deviation: number;
  energy_actual_kwh: number;
  energy_baseline_kwh: number;
  energy_deviation_kwh: number;
  revenue_actual: number;
  revenue_baseline: number;
  revenue_deviation: number;
}

export interface UserFeedback {
  status: "confirmed" | "doubtful" | "corrected";
  notes?: string;
  fields?: Record<string, boolean>;
}

// 诊断损失分解 (PRD §5.3.6)
export interface DiagnosisLoss {
  id: string;
  task_id: string;
  sub_station_id?: string;
  loss_month: string;
  pr_actual: number;
  pr_baseline: number;
  pr_deviation: number;
  grid_loss: number;
  shutdown_loss: number;
  over_under_volt_loss: number;
  shadow_loss: number;
  clipping_loss: number;
  soiling_loss: number;
  string_loss: number;
  other_loss: number;
  // 损失电量(kWh)
  grid_loss_kwh: number;
  shutdown_loss_kwh: number;
  over_under_volt_loss_kwh: number;
  shadow_loss_kwh: number;
  clipping_loss_kwh: number;
  soiling_loss_kwh: number;
  string_loss_kwh: number;
}

// 故障事件
export interface FaultEvent {
  id: string;
  task_id: string;
  sub_station_id?: string;
  fault_type: FaultType;
  device_sn: string;
  component_capacity: number;
  start_time: string;
  end_time?: string;
  duration_h: number;
  loss_kwh: number;
  example_date?: string;
  chart_path?: string;
  details?: Record<string, unknown>;
}

export type FaultType =
  | "grid_loss"
  | "shutdown"
  | "over_under_volt"
  | "shadow"
  | "clipping"
  | "soiling"
  | "string_outage";

// 损失管线 (用于瀑布图)
export type LossKey =
  | "installation"
  | "iam"
  | "temperature"
  | "shadow"
  | "soiling"
  | "snow"
  | "module_eff"
  | "lid"
  | "connection"
  | "mismatch"
  | "dc_cable"
  | "fault_grid"
  | "fault_shutdown"
  | "fault_volt"
  | "fault_clip"
  | "fault_string"
  | "inverter_eff"
  | "degradation";

export interface LossPipelineItem {
  key: LossKey;
  label: string;
  loss_rate: number; // 损失率(%)
  loss_kwh: number;
  is_diagnosed: boolean; // 是否为已诊断损失
}
