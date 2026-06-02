"use client";

/**
 * 新建电站 — 基础信息填写页
 *
 * 诊断流程中的新增电站前置步骤（PRD §4.3 诊断驱动创建）。
 * 用户在 upload 页选择"新建电站"后跳转至此，填写电站基础参数。
 * 保存后自动回到上传页并自动选中该电站。
 *
 * 流程：upload(选新建) → station-setup(填资料) → upload(自动选中,继续上传)
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Zap,
  Calendar,
  Save,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCreateStation } from "@/lib/data-hooks";

// ── 可选值查表 ──
const RESOURCE_ZONES = [
  { value: "I", label: "I 类资源区 (西北高辐照)" },
  { value: "II", label: "II 类资源区 (北方高原)" },
  { value: "III", label: "III 类资源区 (东部平原)" },
  { value: "IV", label: "IV 类资源区 (南方地区)" },
] as const;

const MODULE_TYPES = [
  { value: "mono", label: "单晶硅 (Monocrystalline)" },
  { value: "poly", label: "多晶硅 (Polycrystalline)" },
  { value: "thin_film", label: "薄膜 (Thin Film)" },
] as const;

const GRID_VOLTAGES = [
  { value: "380V", label: "380V (低压并网)" },
  { value: "10kV", label: "10kV (中压)" },
  { value: "35kV", label: "35kV (高压)" },
  { value: "110kV", label: "110kV (特高压)" },
] as const;

export default function StationSetupPage() {
  const router = useRouter();
  const createStation = useCreateStation();

  const [saving, setSaving] = useState(false);

  // ── 表单状态 ──
  const [name, setName] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [longitude, setLongitude] = useState("");
  const [latitude, setLatitude] = useState("");
  const [resourceZone, setResourceZone] = useState<string>("III");
  const [moduleType, setModuleType] = useState<string>("mono");
  const [modulePower, setModulePower] = useState("550");
  const [dcCapacity, setDcCapacity] = useState("");
  const [gridVoltage, setGridVoltage] = useState<string>("10kV");
  const [gridConnDate, setGridConnDate] = useState("");

  const canSave = name.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        longitude: parseFloat(longitude) || 0,
        latitude: parseFloat(latitude) || 0,
        timezone: "Asia/Shanghai",
        resource_zone: resourceZone as "I" | "II" | "III" | "IV",
        module_type: moduleType,
        module_power: parseInt(modulePower, 10) || 550,
        grid_voltage: parseInt(gridVoltage.replace("kV", ""), 10) || 10,
        grid_conn_date: gridConnDate || undefined,
        status: "active" as const,
        // 附加信息通过 meta 传递
      };

      const result = await createStation.mutateAsync(payload);
      toast.success(`电站「${name}」创建成功`);
      // 跳回上传页，带上新电站 ID
      router.push(`/diagnose/upload?station_id=${result.id}`);
    } catch {
      toast.error("创建失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-dvh flex-col bg-zinc-50">
      {/* 顶部导航 */}
      <div className="flex items-center gap-4 border-b border-zinc-200 bg-white px-6 py-3">
        <Link href="/diagnose/upload">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-semibold">新建电站 — 基础信息</h1>
        </div>
      </div>

      {/* 表单区 */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-xl px-6 py-8 space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-zinc-500" />
                电站基本信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="电站名称 *" required>
                <Input
                  placeholder="例：XX镇光伏电站"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="所在省">
                  <Input
                    placeholder="浙江省"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                  />
                </FormField>
                <FormField label="所在市">
                  <Input
                    placeholder="杭州市"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="经度">
                  <Input
                    placeholder="120.15"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                  />
                </FormField>
                <FormField label="纬度">
                  <Input
                    placeholder="30.28"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                  />
                </FormField>
              </div>

              <FormField label="太阳能资源区">
                <Select value={resourceZone} onValueChange={(v) => setResourceZone(v ?? "III")}>
                  <SelectTrigger>
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
            </CardContent>
          </Card>

          {/* 组件参数 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-zinc-500" />
                组件与装机参数
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="组件类型">
                <Select value={moduleType} onValueChange={(v) => setModuleType(v ?? "mono")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULE_TYPES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="单块组件功率 (Wp)">
                  <Input
                    type="number"
                    placeholder="550"
                    value={modulePower}
                    onChange={(e) => setModulePower(e.target.value)}
                  />
                </FormField>
                <FormField label="装机容量 (kWp)">
                  <Input
                    type="number"
                    placeholder="100"
                    value={dcCapacity}
                    onChange={(e) => setDcCapacity(e.target.value)}
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* 并网信息 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-zinc-500" />
                并网信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="并网电压等级">
                <Select value={gridVoltage} onValueChange={(v) => setGridVoltage(v ?? "10kV")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRID_VOLTAGES.map((v) => (
                      <SelectItem key={v.value} value={v.value}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="并网日期">
                <Input
                  type="date"
                  value={gridConnDate}
                  onChange={(e) => setGridConnDate(e.target.value)}
                />
              </FormField>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center justify-between border-t border-zinc-200 bg-white px-6 py-3">
        <p className="text-xs text-zinc-400">
          创建后可在电站管理中编辑更多参数（PRD §4.3）
        </p>
        <div className="flex items-center gap-3">
          <Link href="/diagnose/upload">
            <Button variant="outline">取消</Button>
          </Link>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-4 w-4" />
                保存电站
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-zinc-600">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );
}
