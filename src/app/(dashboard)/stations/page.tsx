"use client";

/**
 * 电站列表页
 *
 * 功能：
 * - 展示用户所有电站卡片列表
 * - 支持按名称/容量/最近诊断时间排序
 * - 支持搜索和状态筛选（活跃/已归档）
 * - 提供快速入口：新建电站、开始诊断
 *
 * PRD 参考：§4.1.3 电站管理功能，§4.5 电站详情页任务时间线
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Search,
  ArrowUpDown,
  MapPin,
  Calendar,
  Zap,
  MoreHorizontal,
  Trash2,
  Archive,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useStations } from "@/lib/data-hooks";
import type { Station } from "@/types/diagnosis";

// 排序方式定义
type SortField = "name" | "updated_at" | "resource_zone";
type SortDirection = "asc" | "desc";

export default function StationsPage() {
  const { data: stations, isLoading, isError } = useStations();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [sortField, setSortField] = useState<SortField>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // ── 筛选 + 排序后的电站列表 ──
  const filteredStations = useMemo(() => {
    let result = stations ? [...stations] : [];

    // 搜索过滤：按名称模糊匹配
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q));
    }

    // 状态过滤
    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }

    // 排序
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name, "zh-Hans-CN");
      } else if (sortField === "updated_at") {
        cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      } else if (sortField === "resource_zone") {
        cmp = a.resource_zone.localeCompare(b.resource_zone);
      }
      return sortDirection === "desc" ? -cmp : cmp;
    });

    return result;
  }, [stations, searchQuery, statusFilter, sortField, sortDirection]);

  // ── 切换排序 ──
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  return (
    <div className="space-y-6">
      {/* 页头：标题 + 操作按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">电站管理</h1>
          <p className="mt-1 text-sm text-zinc-500">
            管理您的光伏电站配置，查看诊断历史
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/diagnose/upload">
            <Button variant="outline" size="sm">
              <Zap className="mr-2 h-4 w-4" />
              开始诊断
            </Button>
          </Link>
          <Link href="/stations/new">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              新建电站
            </Button>
          </Link>
        </div>
      </div>

      {/* 工具栏：搜索 + 状态筛选 + 排序 */}
      <div className="flex items-center gap-3">
        {/* 搜索框 */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="搜索电站名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 状态筛选 */}
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="w-28">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="active">活跃</SelectItem>
            <SelectItem value="archived">已归档</SelectItem>
          </SelectContent>
        </Select>

        {/* 排序切换 */}
        <div className="flex items-center rounded-lg border border-zinc-200 bg-white">
          {([
            { field: "name" as const, label: "名称" },
            { field: "updated_at" as const, label: "最近更新" },
            { field: "resource_zone" as const, label: "资源区" },
          ]).map(({ field, label }) => (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className={cn(
                "px-3 py-2 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg border-r border-zinc-200 last:border-0",
                sortField === field
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <span className="flex items-center gap-1">
                {label}
                {sortField === field && (
                  <ArrowUpDown className="h-3 w-3" />
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 电站卡片网格 */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Loader2 className="h-12 w-12 text-zinc-300 animate-spin" />
          <h3 className="mt-4 text-sm font-medium text-zinc-500">加载中...</h3>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Zap className="h-12 w-12 text-zinc-300" />
          <h3 className="mt-4 text-sm font-medium text-zinc-500">加载失败</h3>
          <p className="mt-1 text-xs text-zinc-400">请检查网络连接后刷新重试</p>
        </div>
      ) : filteredStations.length === 0 ? (
        // 空状态
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Building2 className="h-12 w-12 text-zinc-300" />
          <h3 className="mt-4 text-sm font-medium text-zinc-500">
            {searchQuery || statusFilter !== "all"
              ? "没有找到匹配的电站"
              : "还没有电站"}
          </h3>
          <p className="mt-1 text-xs text-zinc-400">
            {searchQuery || statusFilter !== "all"
              ? "尝试调整搜索条件或筛选器"
              : "新建您的第一个光伏电站，或直接从诊断流程中创建"}
          </p>
          {!searchQuery && statusFilter === "all" && (
            <Link href="/stations/new" className="mt-4">
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                新建电站
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStations.map((station) => (
            <StationCard key={station.id} station={station} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 电站卡片组件
 * 展示电站关键摘要信息，悬停显示更多操作
 */
function StationCard({ station }: { station: Station }) {
  const isArchived = station.status === "archived";

  return (
    <Card
      className={cn(
        "group relative transition-shadow hover:shadow-md",
        isArchived && "opacity-60"
      )}
    >
      <CardContent className="p-5">
        {/* 电站名称 + 状态标识 */}
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/stations/${station.id}`}
            className="text-base font-semibold text-zinc-900 hover:text-zinc-600 transition-colors truncate"
          >
            {station.name}
          </Link>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant={isArchived ? "secondary" : "default"}>
              {isArchived ? "已归档" : "运行中"}
            </Badge>
            {/* 更多操作下拉菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-100">
                  <MoreHorizontal className="h-4 w-4 text-zinc-500" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem>
                  <Link href={`/stations/${station.id}`} className="flex-1">查看详情</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href={`/stations/${station.id}/edit`} className="flex-1">编辑配置</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-zinc-500">
                  <Archive className="mr-2 h-3.5 w-3.5" />
                  {isArchived ? "取消归档" : "归档电站"}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  删除电站
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 关键参数摘要 */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate text-xs">
              {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs">
              {station.module_power}W · {station.module_type}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs">
              {station.grid_conn_date || "未设置"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-500">
            <span className="text-xs">
              资源区 {station.resource_zone} 类
              {station.feed_in_price && ` · ¥${station.feed_in_price}/kWh`}
            </span>
          </div>
        </div>

        {/* 最近诊断摘要（后续迭代接入） */}
        <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5">
          <p className="text-[11px] text-zinc-400">
            {station.updated_at
              ? `最近更新：${new Date(station.updated_at).toLocaleDateString("zh-CN")}`
              : "暂无诊断记录"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
