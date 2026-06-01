-- ============================================================
-- 光伏健康诊断工具 — 初始数据库 Schema
-- 与 src/types/diagnosis.ts 类型定义严格一致（技术架构 §3.1）
-- ============================================================

-- ── 辅助函数 ──
create or replace function update_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- 1. 电站 (PRD §3.1.1)
-- ============================================================
create table stations (
  id            text primary key default 'st-' || replace(gen_random_uuid()::text, '-', ''),
  owner_id      text not null,                          -- Clerk userId
  name          text not null,
  longitude     double precision not null,
  latitude      double precision not null,
  timezone      text not null default 'Asia/Shanghai',
  resource_zone text not null check (resource_zone in ('I','II','III','IV')),
  grid_conn_date date,
  grid_voltage  integer,                                -- kV
  feed_in_price double precision,                       -- 元/kWh
  module_type   text not null,
  module_model  text,
  module_power  integer not null,                       -- Wp
  temp_coeff    double precision,                       -- %/°C
  status        text not null default 'active' check (status in ('active','archived')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_stations_owner on stations(owner_id);
create index idx_stations_status on stations(status);

-- 自动 updated_at
create trigger trg_stations_updated_at
  before update on stations
  for each row execute function update_timestamp();

-- RLS: 用户仅可见自己的电站
alter table stations enable row level security;
create policy stations_owner_policy on stations
  for all using (owner_id = auth.uid()::text);

-- ============================================================
-- 2. 子场站 (PRD §3.1.2)
-- ============================================================
create table sub_stations (
  id               text primary key default 'sub-' || replace(gen_random_uuid()::text, '-', ''),
  station_id       text not null references stations(id) on delete cascade,
  name             text not null,
  dc_capacity      double precision not null,            -- kWp
  tilt_angle       double precision not null,            -- 度
  azimuth          double precision not null,            -- 度
  string_series    integer not null,                     -- 组串串联数
  string_parallel  integer default 1,                    -- 组串并联数
  inv_brand        text,
  inv_model        text,
  inv_ac_power     double precision not null,            -- kW
  inv_count        integer not null default 1,
  mppt_count       integer,
  strings_per_mppt integer,
  inv_sn_list      jsonb default '[]'::jsonb,            -- 逆变器SN列表
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

create index idx_sub_stations_station on sub_stations(station_id);

-- RLS: 通过父电站 owner_id 关联
alter table sub_stations enable row level security;
create policy sub_stations_owner_policy on sub_stations
  for all using (
    exists (
      select 1 from stations
      where stations.id = sub_stations.station_id
        and stations.owner_id = auth.uid()::text
    )
  );

-- ============================================================
-- 3. 上传文件记录
-- ============================================================
create table uploaded_files (
  id         text primary key default 'f-' || replace(gen_random_uuid()::text, '-', ''),
  task_id    text not null,                              -- 创建时关联任务（可为临时任务）
  name       text not null,
  size       bigint not null,                            -- 字节
  row_count  integer,
  time_start timestamptz,
  time_end   timestamptz,
  encoding   text not null default 'UTF-8',
  created_at timestamptz not null default now()
);

create index idx_files_task on uploaded_files(task_id);

-- ============================================================
-- 4. 诊断任务 (PRD §4.2)
-- ============================================================
create table diagnosis_tasks (
  id              text primary key default 'task-' || replace(gen_random_uuid()::text, '-', ''),
  station_id      text not null references stations(id) on delete cascade,
  owner_id        text not null,                          -- Clerk userId
  status          text not null default 'pending'
                    check (status in ('pending','analyzing','completed','failed')),
  scope           jsonb not null default '{}'::jsonb,
    -- { sub_station_ids: string[], date_range: { start, end } }
  data_start      date,
  data_end        date,
  summary         jsonb,                                  -- TaskSummary (nullable until completed)
  report_number   text,
  error_message   text,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz,

  -- 如果对接引擎则记录 engine_task_id
  engine_task_id  text
);

create index idx_tasks_station on diagnosis_tasks(station_id);
create index idx_tasks_owner on diagnosis_tasks(owner_id);
create index idx_tasks_status on diagnosis_tasks(status);
create index idx_tasks_created on diagnosis_tasks(created_at desc);

-- report_number 唯一索引
create unique index idx_tasks_report_number on diagnosis_tasks(report_number)
  where report_number is not null;

alter table diagnosis_tasks enable row level security;
create policy tasks_owner_policy on diagnosis_tasks
  for all using (owner_id = auth.uid()::text);

-- ============================================================
-- 5. 字段映射记录 (PRD §5.1.2)
-- ============================================================
create table field_mappings (
  id          text primary key default 'map-' || replace(gen_random_uuid()::text, '-', ''),
  task_id     text not null references diagnosis_tasks(id) on delete cascade,
  file_id     text,                                      -- 关联 uploaded_files
  col_index   integer not null,
  col_name    text not null,
  field_code  text,                                      -- D0-D12 或 null（未映射）
  confidence  integer,                                   -- AI 置信度 0-100
  confirmed   boolean not null default false,
  created_at  timestamptz not null default now()
);

create index idx_mappings_task on field_mappings(task_id);

-- RLS: 通过任务 owner_id 关联
alter table field_mappings enable row level security;
create policy mappings_owner_policy on field_mappings
  for all using (
    exists (
      select 1 from diagnosis_tasks
      where diagnosis_tasks.id = field_mappings.task_id
        and diagnosis_tasks.owner_id = auth.uid()::text
    )
  );

-- ============================================================
-- 6. 诊断损失分解 (PRD §5.3.6)
-- ============================================================
create table diagnosis_losses (
  id                     text primary key default 'loss-' || replace(gen_random_uuid()::text, '-', ''),
  task_id                text not null references diagnosis_tasks(id) on delete cascade,
  sub_station_id         text,
  loss_month             text not null,                   -- YYYY-MM
  pr_actual              double precision not null,
  pr_baseline            double precision not null,
  pr_deviation           double precision not null,
  grid_loss              double precision default 0,
  shutdown_loss          double precision default 0,
  over_under_volt_loss   double precision default 0,
  shadow_loss            double precision default 0,
  clipping_loss          double precision default 0,
  soiling_loss           double precision default 0,
  string_loss            double precision default 0,
  other_loss             double precision default 0,
  grid_loss_kwh          double precision default 0,
  shutdown_loss_kwh      double precision default 0,
  over_under_volt_loss_kwh double precision default 0,
  shadow_loss_kwh        double precision default 0,
  clipping_loss_kwh      double precision default 0,
  soiling_loss_kwh       double precision default 0,
  string_loss_kwh        double precision default 0,
  created_at             timestamptz not null default now()
);

create index idx_losses_task on diagnosis_losses(task_id);

alter table diagnosis_losses enable row level security;
create policy losses_owner_policy on diagnosis_losses
  for all using (
    exists (
      select 1 from diagnosis_tasks
      where diagnosis_tasks.id = diagnosis_losses.task_id
        and diagnosis_tasks.owner_id = auth.uid()::text
    )
  );

-- ============================================================
-- 7. 故障事件 (PRD §5.3.6)
-- ============================================================
create table fault_events (
  id                text primary key default 'fault-' || replace(gen_random_uuid()::text, '-', ''),
  task_id           text not null references diagnosis_tasks(id) on delete cascade,
  sub_station_id    text,
  fault_type        text not null
                      check (fault_type in (
                        'grid_loss','shutdown','over_under_volt',
                        'shadow','clipping','soiling','string_outage'
                      )),
  device_sn         text not null,
  component_capacity double precision,
  start_time        timestamptz not null,
  end_time          timestamptz,
  duration_h        double precision not null,
  loss_kwh          double precision not null,
  example_date      date,
  chart_path        text,
  details           jsonb,
  created_at        timestamptz not null default now()
);

create index idx_faults_task on fault_events(task_id);

alter table fault_events enable row level security;
create policy faults_owner_policy on fault_events
  for all using (
    exists (
      select 1 from diagnosis_tasks
      where diagnosis_tasks.id = fault_events.task_id
        and diagnosis_tasks.owner_id = auth.uid()::text
    )
  );

-- ============================================================
-- 8. 离线事件 (PRD §5.3.7)
-- ============================================================
create table offline_events (
  id            text primary key default 'off-' || replace(gen_random_uuid()::text, '-', ''),
  task_id       text not null references diagnosis_tasks(id) on delete cascade,
  logger_sn     text not null,
  inverter_sn   text not null,
  offline_hours double precision not null,
  offline_count integer not null,
  example_dates jsonb default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

create index idx_offline_task on offline_events(task_id);

alter table offline_events enable row level security;
create policy offline_owner_policy on offline_events
  for all using (
    exists (
      select 1 from diagnosis_tasks
      where diagnosis_tasks.id = offline_events.task_id
        and diagnosis_tasks.owner_id = auth.uid()::text
    )
  );

-- ============================================================
-- 9. 用户反馈 (PRD §4.2.4)
-- ============================================================
create table user_feedbacks (
  id        text primary key default 'fb-' || replace(gen_random_uuid()::text, '-', ''),
  task_id   text not null references diagnosis_tasks(id) on delete cascade,
  status    text not null check (status in ('confirmed','doubtful','corrected')),
  notes     text,
  fields    jsonb default '{}'::jsonb,                   -- { field_code: true/false }
  created_at timestamptz not null default now()
);

create unique index idx_feedback_task on user_feedbacks(task_id);

alter table user_feedbacks enable row level security;
create policy feedback_owner_policy on user_feedbacks
  for all using (
    exists (
      select 1 from diagnosis_tasks
      where diagnosis_tasks.id = user_feedbacks.task_id
        and diagnosis_tasks.owner_id = auth.uid()::text
    )
  );

-- ============================================================
-- 10. 报告生成快照（每次完成诊断时写入）
-- ============================================================
create table report_snapshots (
  id            text primary key default 'rpt-' || replace(gen_random_uuid()::text, '-', ''),
  task_id       text not null references diagnosis_tasks(id) on delete cascade,
  data          jsonb not null,                           -- 完整报告 JSON
  exported_at   timestamptz,                              -- 最近导出时间
  created_at    timestamptz not null default now()
);

create unique index idx_snapshot_task on report_snapshots(task_id);

alter table report_snapshots enable row level security;
create policy snapshot_owner_policy on report_snapshots
  for all using (
    exists (
      select 1 from diagnosis_tasks
      where diagnosis_tasks.id = report_snapshots.task_id
        and diagnosis_tasks.owner_id = auth.uid()::text
    )
  );
