"use client";

/**
 * 电站编辑页
 *
 * PRD §4.1.3 编辑电站功能：修改电站级或子场站级参数。
 * 关键规则：修改后的参数仅对后续新任务生效，不影响已完成的历史任务。
 *
 * 功能：
 *   - 编辑电站级公共参数（S1-S12）
 *   - 编辑已有子场站参数（Z1-Z13）
 *   - 新增子场站（如扩建了新区域，PRD §3.1.3）
 *   - 删除子场站（需确认）
 *   - 复制子场站参数（PRD §3.1.4 快捷操作）
 */

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Building2,
  Cpu,
  Sun,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Station, SubStation } from "@/types/diagnosis";

// ── 常量（与新建页共享） ──
const TIMEZONES = [
  { value: "Asia/Shanghai", label: "中国标准时间 (UTC+8)" },
  { value: "Asia/Urumqi", label: "新疆时间 (UTC+6)" },
];
const RESOURCE_ZONES = [
  { value: "I", label: "I 类资源区" },
  { value: "II", label: "II 类资源区" },
  { value: "III", label: "III 类资源区" },
  { value: "IV", label: "IV 类资源区" },
];
const MODULE_TYPES = [
  { value: "单晶", label: "单晶硅" },
  { value: "多晶", label: "多晶硅" },
  { value: "薄膜", label: "薄膜" },
];

// ── 子场站编辑数据类型（与新建页一致） ──
interface SubStationEdit {
  tempId: string;
  /** 已有子场站的数据库 ID（用于更新），新增子场站此字段为空 */
  persistedId?: string;
  name: string;
  dc_capacity: string;
  tilt_angle: string;
  azimuth: string;
  string_series: string;
  inv_ac_power: string;
  inv_count: string;
  string_parallel: string;
  inv_brand: string;
  inv_model: string;
  mppt_count: string;
  strings_per_mppt: string;
  inv_sn_list: string;
}

/** 从已有子场站数据转换为编辑表单数据 */
function subStationToEdit(s: SubStation): SubStationEdit {
  return {
    tempId: s.id,
    persistedId: s.id,
    name: s.name,
    dc_capacity: String(s.dc_capacity),
    tilt_angle: String(s.tilt_angle),
    azimuth: String(s.azimuth),
    string_series: String(s.string_series),
    inv_ac_power: String(s.inv_ac_power),
    inv_count: String(s.inv_count),
    string_parallel: s.string_parallel != null ? String(s.string_parallel) : "",
    inv_brand: s.inv_brand ?? "",
    inv_model: s.inv_model ?? "",
    mppt_count: s.mppt_count != null ? String(s.mppt_count) : "",
    strings_per_mppt: s.strings_per_mppt != null ? String(s.strings_per_mppt) : "",
    inv_sn_list: s.inv_sn_list?.join(", ") ?? "",
  };
}

/** 生成空白子场站模板 */
function createEmptySubStation(): SubStationEdit {
  return {
    tempId: `new-${Math.random().toString(36).slice(2, 8)}`,
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

// ── 模拟已有子场站数据 ──
const MOCK_SUB_STATIONS: SubStation[] = [
  {
    id: "sub-001", station_id: "st-001", name: "屋顶A区",
    dc_capacity: 200, tilt_angle: 30, azimuth: 180, string_series: 20,
    string_parallel: 10, inv_brand: "华为", inv_model: "SUN2000-50KTL-M3",
    inv_ac_power: 50, inv_count: 4, mppt_count: 6, strings_per_mppt: 2,
    inv_sn_list: ["SN-20230101", "SN-20230102"], sort_order: 0,
  },
  {
    id: "sub-002", station_id: "st-001", name: "屋顶B区",
    dc_capacity: 150, tilt_angle: 15, azimuth: 150, string_series: 18,
    string_parallel: 8, inv_brand: "华为", inv_model: "SUN2000-40KTL-M3",
    inv_ac_power: 40, inv_count: 3, mppt_count: 4, strings_per_mppt: 2,
    inv_sn_list: ["SN-20230201"], sort_order: 1,
  },
];

export default function EditStationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  // ── 表单状态（模拟从 API 加载已有数据） ──
  const [station, setStation] = useState({
    name: "西郊分布式光伏电站",
    longitude: "120.1234",
    latitude: "31.5678",
    timezone: "Asia/Shanghai",
    resource_zone: "III",
    grid_conn_date: "2023-06-15",
    grid_voltage: "10",
    feed_in_price: "0.391",
    module_type: "单晶",
    module_model: "LR5-72HPH-545M",
    module_power: "545",
    temp_coeff: "-0.0035",
  });

  const [subStations, setSubStations] = useState<SubStationEdit[]>(
    MOCK_SUB_STATIONS.map(subStationToEdit)
  );
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(
    new Set(subStations.map((s) => s.tempId))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── 删除确认对话框 ──
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // ── 通用更新操作 ──
  const updateStation = useCallback(
    (key: string, value: string | null) =>
      setStation((s) => ({ ...s, [key]: value ?? "" })),
    []
  );

  const updateSubStation = useCallback(
    (tempId: string, key: keyof SubStationEdit, value: string | null) =>
      setSubStations((list) =>
        list.map((s) => (s.tempId === tempId ? { ...s, [key]: value ?? "" } : s))
      ),
    []
  );

  // ── 子场站操作 ──
  const addSubStation = useCallback(
    (copyFrom?: string) => {
      if (copyFrom) {
        const source = subStations.find((s) => s.tempId === copyFrom);
        if (source) {
          const copied = { ...source, tempId: `new-${Math.random().toString(36).slice(2, 8)}`, name: "", persistedId: undefined };
          setSubStations((list) => [...list, copied]);
          setExpandedSubs((set) => new Set([...set, copied.tempId]));
          toast.success("已从已有子场站复制参数");
          return;
        }
      }
      const newSub = createEmptySubStation();
      setSubStations((list) => [...list, newSub]);
      setExpandedSubs((set) => new Set([...set, newSub.tempId]));
    },
    [subStations]
  );

  const confirmDeleteSubStation = useCallback(
    (tempId: string) => setDeleteTarget(tempId),
    []
  );

  const removeSubStation = useCallback(() => {
    if (!deleteTarget) return;
    // PRD: 子场站数量 ≥ 1；但编辑场景下若只剩一个则拒绝删除
    if (subStations.length <= 1) {
      toast.error("至少保留一个子场站");
      setDeleteTarget(null);
      return;
    }
    setSubStations((list) => list.filter((s) => s.tempId !== deleteTarget));
    setExpandedSubs((set) => {
      const next = new Set(set);
      next.delete(deleteTarget);
      return next;
    });
    setDeleteTarget(null);
    toast.success("子场站已删除");
  }, [deleteTarget, subStations.length]);

  const toggleExpand = useCallback((tempId: string) => {
    setExpandedSubs((set) => {
      const next = new Set(set);
      next.has(tempId) ? next.delete(tempId) : next.add(tempId);
      return next;
    });
  }, []);

  // ── 提交保存 ──
  const handleSubmit = async () => {
    // 基本校验
    if (!station.name.trim()) { toast.error("请填写电站名称"); return; }
    const lng = parseFloat(station.longitude);
    const lat = parseFloat(station.latitude);
    if (isNaN(lng) || lng < -180 || lng > 180) { toast.error("经度范围 -180~180"); return; }
    if (isNaN(lat) || lat < -90 || lat > 90) { toast.error("纬度范围 -90~90"); return; }
    if (!station.module_power.trim()) { toast.error("请填写组件功率"); return; }
    for (const sub of subStations) {
      if (!sub.name.trim()) { toast.error("每个子场站需填写名称"); return; }
      if (!sub.dc_capacity.trim()) { toast.error(`子场站"${sub.name}"缺少组件容量`); return; }
      if (!sub.tilt_angle.trim()) { toast.error(`子场站"${sub.name}"缺少安装倾角`); return; }
      if (!sub.azimuth.trim()) { toast.error(`子场站"${sub.name}"缺少方位角`); return; }
    }

    setIsSubmitting(true);
    try {
      // TODO: 调用 API PUT /api/v1/stations/:id 保存
      await new Promise((r) => setTimeout(r, 600));
      toast.success("电站配置已更新（仅对新任务生效）");
      router.push(`/stations/${params.id}`);
    } catch {
      toast.error("保存失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* 页头 */}
      <div className="flex items-center gap-4">
        <Link href={`/stations/${params.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">编辑电站</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            修改后的参数仅对新任务生效，不影响历史诊断结果（PRD §4.1.3）
          </p>
        </div>
      </div>

      {/* ── 电站基本信息 ── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-zinc-500" />
            <CardTitle className="text-base">电站基本信息</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="电站名称" required>
              <Input value={station.name} onChange={(e) => updateStation("name", e.target.value)} />
            </FormField>
            <FormField label="时区" required>
              <Select value={station.timezone} onValueChange={(v) => updateStation("timezone", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (<SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="经度" required>
              <Input type="number" step="any" value={station.longitude} onChange={(e) => updateStation("longitude", e.target.value)} />
            </FormField>
            <FormField label="纬度" required>
              <Input type="number" step="any" value={station.latitude} onChange={(e) => updateStation("latitude", e.target.value)} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField label="资源区分类" required>
              <Select value={station.resource_zone} onValueChange={(v) => updateStation("resource_zone", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOURCE_ZONES.map((z) => (<SelectItem key={z.value} value={z.value}>{z.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="并网日期">
              <Input type="date" value={station.grid_conn_date} onChange={(e) => updateStation("grid_conn_date", e.target.value)} />
            </FormField>
            <FormField label="并网电压等级(kV)">
              <Input type="number" step="any" value={station.grid_voltage} onChange={(e) => updateStation("grid_voltage", e.target.value)} />
            </FormField>
          </div>

          <FormField label="上网电价（元/kWh）">
            <Input type="number" step="any" value={station.feed_in_price} onChange={(e) => updateStation("feed_in_price", e.target.value)} className="max-w-xs" />
          </FormField>
        </CardContent>
      </Card>

      {/* ── 组件参数 ── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-zinc-500" />
            <CardTitle className="text-base">组件参数</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="组件类型" required>
              <Select value={station.module_type} onValueChange={(v) => updateStation("module_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODULE_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="组件型号">
              <Input value={station.module_model} onChange={(e) => updateStation("module_model", e.target.value)} />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="单块组件额定功率(Wp)" required>
              <Input type="number" step="any" value={station.module_power} onChange={(e) => updateStation("module_power", e.target.value)} />
            </FormField>
            <FormField label="温度损耗系数">
              <Input type="number" step="any" value={station.temp_coeff} onChange={(e) => updateStation("temp_coeff", e.target.value)} />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* ── 子场站配置 ── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-zinc-500" />
              <CardTitle className="text-base">子场站配置</CardTitle>
              <Badge variant="secondary">{subStations.length} 个</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => addSubStation()}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              添加子场站
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {subStations.map((sub, index) => {
            const isExpanded = expandedSubs.has(sub.tempId);
            const isNew = !sub.persistedId; // 新增标记
            return (
              <div
                key={sub.tempId}
                className={cn(
                  "rounded-lg border transition-colors",
                  isExpanded ? "border-zinc-300 bg-white" : "border-zinc-200 bg-zinc-50"
                )}
              >
                {/* 子场站头部 */}
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
                    子场站 {index + 1}{sub.name ? `：${sub.name}` : "（未命名）"}
                    {isNew && <Badge className="ml-2 text-[10px]" variant="outline">新建</Badge>}
                  </span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); addSubStation(sub.tempId); }} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-100" title="复制参数">
                    <Copy className="h-3 w-3" /> 复制
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); confirmDeleteSubStation(sub.tempId); }}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    title="删除子场站"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>

                {isExpanded && (
                  <div className="border-t border-zinc-200 px-4 py-4 space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <FormField label="子场站名称" required>
                        <Input value={sub.name} onChange={(e) => updateSubStation(sub.tempId, "name", e.target.value)} />
                      </FormField>
                      <FormField label="组件容量(kWp)" required>
                        <Input type="number" step="any" value={sub.dc_capacity} onChange={(e) => updateSubStation(sub.tempId, "dc_capacity", e.target.value)} />
                      </FormField>
                      <FormField label="逆变器数量" required>
                        <Input type="number" min="1" value={sub.inv_count} onChange={(e) => updateSubStation(sub.tempId, "inv_count", e.target.value)} />
                      </FormField>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <FormField label="安装倾角(°)" required>
                        <Input type="number" step="any" value={sub.tilt_angle} onChange={(e) => updateSubStation(sub.tempId, "tilt_angle", e.target.value)} />
                      </FormField>
                      <FormField label="方位角(°)" required>
                        <Input type="number" step="any" value={sub.azimuth} onChange={(e) => updateSubStation(sub.tempId, "azimuth", e.target.value)} />
                      </FormField>
                      <FormField label="组串串联数" required>
                        <Input type="number" min="1" value={sub.string_series} onChange={(e) => updateSubStation(sub.tempId, "string_series", e.target.value)} />
                      </FormField>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField label="逆变器额定功率(kW)" required>
                        <Input type="number" step="any" value={sub.inv_ac_power} onChange={(e) => updateSubStation(sub.tempId, "inv_ac_power", e.target.value)} />
                      </FormField>
                      <FormField label="逆变器品牌">
                        <Input value={sub.inv_brand} onChange={(e) => updateSubStation(sub.tempId, "inv_brand", e.target.value)} />
                      </FormField>
                      <FormField label="逆变器型号">
                        <Input value={sub.inv_model} onChange={(e) => updateSubStation(sub.tempId, "inv_model", e.target.value)} />
                      </FormField>
                      <FormField label="组串并联数">
                        <Input type="number" min="0" value={sub.string_parallel} onChange={(e) => updateSubStation(sub.tempId, "string_parallel", e.target.value)} />
                      </FormField>
                      <FormField label="MPPT路数">
                        <Input type="number" min="0" value={sub.mppt_count} onChange={(e) => updateSubStation(sub.tempId, "mppt_count", e.target.value)} />
                      </FormField>
                      <FormField label="每个MPPT接入组串数">
                        <Input type="number" min="0" value={sub.strings_per_mppt} onChange={(e) => updateSubStation(sub.tempId, "strings_per_mppt", e.target.value)} />
                      </FormField>
                    </div>

                    <FormField label="逆变器SN列表" helpText="逗号分隔，用于设备归属校验">
                      <Input value={sub.inv_sn_list} onChange={(e) => updateSubStation(sub.tempId, "inv_sn_list", e.target.value)} />
                    </FormField>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 提交区 */}
      <div className="sticky bottom-0 -mx-6 border-t border-zinc-200 bg-white px-6 py-4 flex items-center justify-between rounded-b-lg">
        <p className="text-xs text-zinc-400">修改仅对后续新任务生效，历史报告不受影响</p>
        <div className="flex items-center gap-3">
          <Link href={`/stations/${params.id}`}><Button variant="outline">取消</Button></Link>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : <><Save className="mr-2 h-4 w-4" />保存修改</>}
          </Button>
        </div>
      </div>

      {/* 删除确认对话框 */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除子场站？</DialogTitle>
            <DialogDescription>
              删除后该子场站的历史诊断数据仍保留，但后续新任务将不包含此区域。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={removeSubStation}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** 表单字段包装器 */
function FormField({
  label, required, helpText, children,
}: {
  label: string;
  required?: boolean;
  helpText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-zinc-600">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {children}
      {helpText && <p className="text-[11px] text-zinc-400">{helpText}</p>}
    </div>
  );
}
