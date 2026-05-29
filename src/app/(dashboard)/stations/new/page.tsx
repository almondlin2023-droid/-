"use client";

/**
 * 新建电站页面
 *
 * 按 PRD §3.1.3 子场站创建与数据关联流程，分三步：
 *   第1步：填写电站级公共参数（S1-S12）
 *   第2步：创建子场站（Z1-Z13），至少 1 个
 *   第3步：提交保存 → 跳转到电站详情页（后续上传数据触发诊断）
 *
 * 表单设计遵循 PRD §3.1 静态参数层级：
 *   - 电站级（公共）：经纬度、时区、资源区、组件参数、电价等所有子场站共用
 *   - 子场站级（差异）：各子场站拥有独立的倾角、方位角、组件容量(Z2)、逆变器配置
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  MapPin,
  Building2,
  Cpu,
  Sun,
  Zap,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── 常量定义 ──

// 中国时区列表
const TIMEZONES = [
  { value: "Asia/Shanghai", label: "中国标准时间 (UTC+8)" },
  { value: "Asia/Urumqi", label: "新疆时间 (UTC+6)" },
];

// 资源区分类 (PRD §3.1.1 S5)
const RESOURCE_ZONES = [
  { value: "I", label: "I 类资源区（青藏高原、甘肃北部等）" },
  { value: "II", label: "II 类资源区（内蒙古、宁夏等）" },
  { value: "III", label: "III 类资源区（东部沿海、华北平原等）" },
  { value: "IV", label: "IV 类资源区（四川盆地、贵州等）" },
];

// 组件类型 (PRD §3.1.1 S9)
const MODULE_TYPES = [
  { value: "单晶", label: "单晶硅" },
  { value: "多晶", label: "多晶硅" },
  { value: "薄膜", label: "薄膜" },
];

// ── 子场站表单数据类型 ──
interface SubStationForm {
  /** 唯一 key，用临时 ID 标识（提交前不会持久化到数据库） */
  tempId: string;
  // 必填字段 (PRD §3.1.2)
  name: string; // Z1: 子场站名称
  dc_capacity: string; // Z2: 组件容量(kWp)
  tilt_angle: string; // Z3: 安装倾角(度)
  azimuth: string; // Z4: 方位角(度)
  string_series: string; // Z5: 组串串联数
  inv_ac_power: string; // Z9: 逆变器额定功率(kW)
  inv_count: string; // Z10: 逆变器数量
  // 选填字段
  string_parallel: string; // Z6: 组串并联数
  inv_brand: string; // Z7: 逆变器品牌
  inv_model: string; // Z8: 逆变器型号
  mppt_count: string; // Z11: MPPT路数
  strings_per_mppt: string; // Z12: 每个MPPT组串数
  inv_sn_list: string; // Z13: 逆变器SN列表（逗号分隔输入）
}

// ── 电站表单数据类型 ──
interface StationFormData {
  // 电站级公共参数
  name: string;
  longitude: string;
  latitude: string;
  timezone: string;
  resource_zone: string;
  grid_conn_date: string;
  grid_voltage: string;
  feed_in_price: string;
  module_type: string;
  module_model: string;
  module_power: string;
  temp_coeff: string;
}

// ── 默认值 ──
const EMPTY_STATION_FORM: StationFormData = {
  name: "",
  longitude: "",
  latitude: "",
  timezone: "Asia/Shanghai",
  resource_zone: "III",
  grid_conn_date: "",
  grid_voltage: "",
  feed_in_price: "",
  module_type: "单晶",
  module_model: "",
  module_power: "",
  temp_coeff: "",
};

/** 生成一个新的空白子场站表单 */
function createEmptySubStation(): SubStationForm {
  return {
    tempId: `sub-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    dc_capacity: "",
    tilt_angle: "",
    azimuth: "",
    string_series: "",
    inv_ac_power: "",
    inv_count: "1",
    string_parallel: "",
    inv_brand: "",
    inv_model: "",
    mppt_count: "",
    strings_per_mppt: "",
    inv_sn_list: "",
  };
}

// ── 必填的电站字段（用于提交前校验） ──
const REQUIRED_STATION_FIELDS: { key: keyof StationFormData; label: string }[] = [
  { key: "name", label: "电站名称" },
  { key: "longitude", label: "经度" },
  { key: "latitude", label: "纬度" },
  { key: "module_power", label: "组件功率" },
];

// ── 必填的子场站字段 ──
const REQUIRED_SUB_FIELDS: { key: keyof SubStationForm; label: string }[] = [
  { key: "name", label: "子场站名称" },
  { key: "dc_capacity", label: "组件容量" },
  { key: "tilt_angle", label: "安装倾角" },
  { key: "azimuth", label: "方位角" },
  { key: "string_series", label: "组串串联数" },
  { key: "inv_ac_power", label: "逆变器额定功率" },
  { key: "inv_count", label: "逆变器数量" },
];

export default function NewStationPage() {
  const router = useRouter();
  const [station, setStation] = useState<StationFormData>(EMPTY_STATION_FORM);
  const [subStations, setSubStations] = useState<SubStationForm[]>([
    createEmptySubStation(),
  ]);
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(
    new Set([subStations[0]?.tempId].filter(Boolean))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── 通用表单更新（Select 组件的 onValueChange 可能传 null，做空值兜底处理） ──
  const updateStation = useCallback(
    (key: keyof StationFormData, value: string | null) =>
      setStation((s) => ({ ...s, [key]: value ?? "" })),
    []
  );

  const updateSubStation = useCallback(
    (tempId: string, key: keyof SubStationForm, value: string | null) =>
      setSubStations((list) =>
        list.map((s) => (s.tempId === tempId ? { ...s, [key]: value ?? "" } : s))
      ),
    []
  );

  // ── 子场站操作 ──
  /** 新增子场站（PRD §3.1.4 允许从已有子场站复制参数） */
  const addSubStation = useCallback(
    (copyFrom?: string) => {
      if (copyFrom) {
        const source = subStations.find((s) => s.tempId === copyFrom);
        if (source) {
          const copied = { ...source, tempId: `sub-${Math.random().toString(36).slice(2, 8)}`, name: "" };
          setSubStations((list) => [...list, copied]);
          setExpandedSubs((set) => new Set([...set, copied.tempId]));
          toast.success("已从已有子场站复制参数，请修改名称和差异化字段");
          return;
        }
      }
      const newSub = createEmptySubStation();
      setSubStations((list) => [...list, newSub]);
      setExpandedSubs((set) => new Set([...set, newSub.tempId]));
    },
    [subStations]
  );

  const removeSubStation = useCallback(
    (tempId: string) => {
      // PRD 要求子场站数量 ≥ 1
      if (subStations.length <= 1) {
        toast.error("至少保留一个子场站");
        return;
      }
      setSubStations((list) => list.filter((s) => s.tempId !== tempId));
      setExpandedSubs((set) => {
        const next = new Set(set);
        next.delete(tempId);
        return next;
      });
    },
    [subStations.length]
  );

  const toggleExpand = useCallback((tempId: string) => {
    setExpandedSubs((set) => {
      const next = new Set(set);
      next.has(tempId) ? next.delete(tempId) : next.add(tempId);
      return next;
    });
  }, []);

  // ── 表单校验 ──
  const validate = useCallback((): string | null => {
    // 电站必填字段校验
    for (const { key, label } of REQUIRED_STATION_FIELDS) {
      if (!station[key].trim()) return `请填写"${label}"`;
    }
    // 经纬度范围校验
    const lng = parseFloat(station.longitude);
    const lat = parseFloat(station.latitude);
    if (isNaN(lng) || lng < -180 || lng > 180) return "经度范围应在 -180 到 180 之间";
    if (isNaN(lat) || lat < -90 || lat > 90) return "纬度范围应在 -90 到 90 之间";

    // 子场站必填字段校验
    for (const sub of subStations) {
      for (const { key, label } of REQUIRED_SUB_FIELDS) {
        if (!sub[key].trim()) return `子场站"${sub.name || "未命名"}"缺少"${label}"`;
      }
      // 数值范围校验
      const tilt = parseFloat(sub.tilt_angle);
      if (isNaN(tilt) || tilt < 0 || tilt > 90) return `子场站"${sub.name}"倾角应在 0-90° 之间`;
      const az = parseFloat(sub.azimuth);
      if (isNaN(az) || az < 0 || az > 360) return `子场站"${sub.name}"方位角应在 0-360° 之间`;
    }
    return null; // 校验通过
  }, [station, subStations]);

  // ── 提交 ──
  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: 调用 API 创建电站（POST /api/v1/stations + 子场站）
      // const payload = { ...station, sub_stations: subStations };
      // await api.stations.create(payload);

      // 模拟提交延迟
      await new Promise((r) => setTimeout(r, 600));
      toast.success("电站创建成功！可在电站详情页上传数据开始诊断");
      // 跳转回电站列表（后续改为跳转到电站详情页）
      router.push("/stations");
    } catch {
      toast.error("创建失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* 页头 */}
      <div className="flex items-center gap-4">
        <Link href="/stations">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">新建电站</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            填写电站级参数后配置子场站，所有参数后续可修改
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 第1步：电站级公共参数（PRD §3.1.1 S1-S12） */}
      {/* ============================================================ */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-zinc-500" />
            <CardTitle className="text-base">电站基本信息</CardTitle>
            <Badge variant="secondary" className="ml-auto">所有子场站共用</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 第一行：名称 + 时区 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="电站名称" required htmlFor="s-name">
              <Input
                id="s-name"
                placeholder="如：西郊分布式光伏电站"
                value={station.name}
                onChange={(e) => updateStation("name", e.target.value)}
              />
            </FormField>
            <FormField label="时区" required htmlFor="s-tz">
              <Select
                value={station.timezone}
                onValueChange={(v) => updateStation("timezone", v)}
              >
                <SelectTrigger id="s-tz">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          {/* 经纬度（PRD: 所有依赖地理位置的分析项都需要） */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="经度" required htmlFor="s-lng">
              <Input
                id="s-lng"
                type="number"
                step="any"
                placeholder="如 120.1234"
                value={station.longitude}
                onChange={(e) => updateStation("longitude", e.target.value)}
              />
            </FormField>
            <FormField label="纬度" required htmlFor="s-lat">
              <Input
                id="s-lat"
                type="number"
                step="any"
                placeholder="如 31.5678"
                value={station.latitude}
                onChange={(e) => updateStation("latitude", e.target.value)}
              />
            </FormField>
          </div>

          {/* 资源区 + 并网信息 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField label="资源区分类" required htmlFor="s-zone">
              <Select
                value={station.resource_zone}
                onValueChange={(v) => updateStation("resource_zone", v)}
              >
                <SelectTrigger id="s-zone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_ZONES.map((z) => (
                    <SelectItem key={z.value} value={z.value}>
                      {z.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="并网日期" htmlFor="s-date">
              <Input
                id="s-date"
                type="date"
                value={station.grid_conn_date}
                onChange={(e) => updateStation("grid_conn_date", e.target.value)}
              />
            </FormField>
            <FormField label="并网电压等级(kV)" htmlFor="s-volt">
              <Input
                id="s-volt"
                type="number"
                step="any"
                placeholder="如 10"
                value={station.grid_voltage}
                onChange={(e) => updateStation("grid_voltage", e.target.value)}
              />
            </FormField>
          </div>

          {/* 上网电价 */}
          <FormField label="上网电价（元/kWh）" htmlFor="s-price">
            <Input
              id="s-price"
              type="number"
              step="any"
              placeholder="如 0.391（脱硫煤标杆电价）"
              value={station.feed_in_price}
              onChange={(e) => updateStation("feed_in_price", e.target.value)}
              className="max-w-xs"
            />
          </FormField>
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* 组件参数（PRD §3.1.1 S9-S12） */}
      {/* ============================================================ */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-zinc-500" />
            <CardTitle className="text-base">组件参数</CardTitle>
            <Badge variant="secondary" className="ml-auto">所有子场站共用</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="组件类型" required htmlFor="s-mtype">
              <Select
                value={station.module_type}
                onValueChange={(v) => updateStation("module_type", v)}
              >
                <SelectTrigger id="s-mtype">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="组件型号" htmlFor="s-mmodel">
              <Input
                id="s-mmodel"
                placeholder="如 LR5-72HPH-545M"
                value={station.module_model}
                onChange={(e) => updateStation("module_model", e.target.value)}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="单块组件额定功率(Wp)" required htmlFor="s-mpower">
              <Input
                id="s-mpower"
                type="number"
                step="any"
                placeholder="如 545"
                value={station.module_power}
                onChange={(e) => updateStation("module_power", e.target.value)}
              />
            </FormField>
            <FormField label="温度损耗系数" htmlFor="s-tcoeff">
              <Input
                id="s-tcoeff"
                type="number"
                step="any"
                placeholder="如 -0.0035（未填则按组件类型取默认值）"
                value={station.temp_coeff}
                onChange={(e) => updateStation("temp_coeff", e.target.value)}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* 第2步：子场站配置（PRD §3.1.2 Z1-Z13） */}
      {/* ============================================================ */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-zinc-500" />
              <CardTitle className="text-base">子场站配置</CardTitle>
              <Badge variant="secondary">至少 1 个</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addSubStation()}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              添加子场站
            </Button>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            子场站用于描述同一电站内因安装条件（倾角/方位角）不同而产生的差异化区域。
            倾角和方位角相同的区域应合并为一个子场站，避免过度拆分（PRD §3.1.2 拆分粒度原则）。
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {subStations.map((sub, index) => {
            const isExpanded = expandedSubs.has(sub.tempId);
            return (
              <div
                key={sub.tempId}
                className={cn(
                  "rounded-lg border transition-colors",
                  isExpanded ? "border-zinc-300 bg-white" : "border-zinc-200 bg-zinc-50"
                )}
              >
                {/* 子场站头部：折叠/展开 + 名称摘要 */}
                <button
                  type="button"
                  onClick={() => toggleExpand(sub.tempId)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-zinc-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                  )}
                  <span className="flex-1 text-sm font-medium">
                    子场站 {index + 1}
                    {sub.name ? `：${sub.name}` : "（未命名）"}
                  </span>
                  {sub.dc_capacity && (
                    <span className="text-xs text-zinc-400">
                      {sub.dc_capacity} kWp
                    </span>
                  )}
                  {/* 复制参数按钮（PRD §3.1.4 快捷操作） */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); addSubStation(sub.tempId); }}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                    title="复制此子场站参数到新子场站"
                  >
                    <Copy className="h-3 w-3" />
                    复制
                  </button>
                  {/* 删除按钮 */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeSubStation(sub.tempId); }}
                    className={cn(
                      "flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-red-50 hover:text-red-600",
                      subStations.length <= 1 && "opacity-30 pointer-events-none"
                    )}
                    title="删除此子场站"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>

                {/* 子场站表单（折叠时隐藏） */}
                {isExpanded && (
                  <div className="border-t border-zinc-200 px-4 py-4 space-y-4">
                    {/* 基本信息 */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <FormField label="子场站名称" required>
                        <Input
                          placeholder="如 屋顶A区 / 1号地块"
                          value={sub.name}
                          onChange={(e) => updateSubStation(sub.tempId, "name", e.target.value)}
                        />
                      </FormField>
                      <FormField label="组件容量(kWp)" required>
                        <Input
                          type="number"
                          step="any"
                          placeholder="= 组串数 × 串联数 × 组件功率"
                          value={sub.dc_capacity}
                          onChange={(e) => updateSubStation(sub.tempId, "dc_capacity", e.target.value)}
                        />
                      </FormField>
                      <FormField label="逆变器数量" required>
                        <Input
                          type="number"
                          min="1"
                          value={sub.inv_count}
                          onChange={(e) => updateSubStation(sub.tempId, "inv_count", e.target.value)}
                        />
                      </FormField>
                    </div>

                    <Separator />

                    {/* 安装条件（子场站核心差异化参数 —— PRD §3.1.2 强调倾角和方位角是拆分维度） */}
                    <div>
                      <p className="mb-3 text-xs font-medium text-zinc-500">
                        📐 安装条件（核心差异化参数 — 直接影响安装条件损失、阴影识别、灰尘损失等分析项）
                      </p>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <FormField label="安装倾角(°)" required>
                          <Input
                            type="number"
                            step="any"
                            placeholder="0-90，如 30"
                            value={sub.tilt_angle}
                            onChange={(e) => updateSubStation(sub.tempId, "tilt_angle", e.target.value)}
                          />
                        </FormField>
                        <FormField label="方位角(°)" required>
                          <Input
                            type="number"
                            step="any"
                            placeholder="北半球正南=180"
                            value={sub.azimuth}
                            onChange={(e) => updateSubStation(sub.tempId, "azimuth", e.target.value)}
                          />
                        </FormField>
                        <FormField label="组串串联数" required>
                          <Input
                            type="number"
                            min="1"
                            placeholder="每组串串联组件数"
                            value={sub.string_series}
                            onChange={(e) => updateSubStation(sub.tempId, "string_series", e.target.value)}
                          />
                        </FormField>
                      </div>
                    </div>

                    <Separator />

                    {/* 逆变器配置 */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField label="逆变器额定功率(kW)" required>
                        <Input
                          type="number"
                          step="any"
                          placeholder="交流侧容量"
                          value={sub.inv_ac_power}
                          onChange={(e) => updateSubStation(sub.tempId, "inv_ac_power", e.target.value)}
                        />
                      </FormField>
                      <FormField label="逆变器品牌">
                        <Input
                          placeholder="如 华为 / 阳光电源"
                          value={sub.inv_brand}
                          onChange={(e) => updateSubStation(sub.tempId, "inv_brand", e.target.value)}
                        />
                      </FormField>
                      <FormField label="逆变器型号">
                        <Input
                          placeholder="如 SUN2000-50KTL-M3"
                          value={sub.inv_model}
                          onChange={(e) => updateSubStation(sub.tempId, "inv_model", e.target.value)}
                        />
                      </FormField>
                      <FormField label="组串并联数">
                        <Input
                          type="number"
                          min="0"
                          placeholder="接入路数"
                          value={sub.string_parallel}
                          onChange={(e) => updateSubStation(sub.tempId, "string_parallel", e.target.value)}
                        />
                      </FormField>
                      <FormField label="MPPT路数">
                        <Input
                          type="number"
                          min="0"
                          placeholder="用于组串匹配性分析"
                          value={sub.mppt_count}
                          onChange={(e) => updateSubStation(sub.tempId, "mppt_count", e.target.value)}
                        />
                      </FormField>
                      <FormField label="每个MPPT接入组串数">
                        <Input
                          type="number"
                          min="0"
                          placeholder="用于掉串识别"
                          value={sub.strings_per_mppt}
                          onChange={(e) => updateSubStation(sub.tempId, "strings_per_mppt", e.target.value)}
                        />
                      </FormField>
                    </div>

                    {/* 逆变器SN列表 */}
                    <FormField label="逆变器SN列表" helpText="逗号或换行分隔，用于数据上传时的设备归属校验">
                      <Input
                        placeholder="如 SN001, SN002, SN003"
                        value={sub.inv_sn_list}
                        onChange={(e) => updateSubStation(sub.tempId, "inv_sn_list", e.target.value)}
                      />
                    </FormField>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* 提交区 */}
      {/* ============================================================ */}
      <div className="sticky bottom-0 -mx-6 border-t border-zinc-200 bg-white px-6 py-4 flex items-center justify-between rounded-b-lg">
        <p className="text-xs text-zinc-400">
          提交后将立即创建电站，所有参数后续可编辑修改
        </p>
        <div className="flex items-center gap-3">
          <Link href="/stations">
            <Button variant="outline">取消</Button>
          </Link>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              "保存中..."
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                保存电站
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * 表单字段包装器
 * 统一标签、必填标记、帮助文字样式
 */
function FormField({
  label,
  required,
  htmlFor,
  helpText,
  children,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
  helpText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-zinc-600">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {children}
      {helpText && <p className="text-[11px] text-zinc-400">{helpText}</p>}
    </div>
  );
}
