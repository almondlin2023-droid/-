/**
 * 数据获取 Hooks（TanStack Query）
 *
 * 前端页面通过此层获取数据，而非直接使用内联 mock 数据。
 *
 * 对接真实后端步骤：
 *   1. 删除 src/lib/mock-data.ts
 *   2. 修改 API 路由：将 mock 数据替换为 fetch(ENGINE_API_URL) 调用
 *   3. 前端 hooks 无需修改（接口不变）
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Station, Task } from "@/types/diagnosis";

// ── 通用 fetch 封装 ──
async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data as T;
}

// ============================================================
// 电站 (Stations)
// ============================================================
export function useStations(params?: { status?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  const qs = searchParams.toString();

  return useQuery({
    queryKey: ["stations", params],
    queryFn: () => fetchJSON<Station[]>(`/api/v1/stations${qs ? `?${qs}` : ""}`),
  });
}

export function useStation(id: string | undefined) {
  return useQuery({
    queryKey: ["station", id],
    queryFn: () => fetchJSON<Station & { subStations: unknown[] }>(`/api/v1/stations/${id}`),
    enabled: !!id,
  });
}

export function useCreateStation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Station>) =>
      fetchJSON<Station>("/api/v1/stations", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stations"] }); },
  });
}

export function useUpdateStation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Station> }) =>
      fetchJSON<Station>(`/api/v1/stations/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["stations"] });
      qc.invalidateQueries({ queryKey: ["station", vars.id] });
    },
  });
}

// ============================================================
// 诊断任务 (Tasks)
// ============================================================
export function useTasks(params?: { stationId?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.stationId) searchParams.set("station_id", params.stationId);
  const qs = searchParams.toString();

  return useQuery({
    queryKey: ["tasks", params],
    queryFn: () => fetchJSON<Task[]>(`/api/v1/tasks${qs ? `?${qs}` : ""}`),
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ["task", id],
    queryFn: () => fetchJSON<Task>(`/api/v1/tasks/${id}`),
    enabled: !!id,
  });
}

export function useTaskStatus(id: string | undefined, { enabled = true } = {}) {
  return useQuery({
    queryKey: ["task", id, "status"],
    queryFn: () => fetchJSON<{ status: string; progress: number; estimated_remaining_s: number }>(`/api/v1/tasks/${id}/status`),
    enabled: !!id && enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;
      return data.status === "analyzing" ? 3000 : false; // PRD §4.2: 分析中每3秒轮询
    },
  });
}

export function useTaskLosses(id: string | undefined) {
  return useQuery({
    queryKey: ["task", id, "losses"],
    queryFn: () => fetchJSON<unknown[]>(`/api/v1/tasks/${id}/losses`),
    enabled: !!id,
  });
}

export function useTaskFaults(id: string | undefined) {
  return useQuery({
    queryKey: ["task", id, "faults"],
    queryFn: () => fetchJSON<unknown[]>(`/api/v1/tasks/${id}/faults`),
    enabled: !!id,
  });
}

export function useTaskReport(id: string | undefined) {
  return useQuery({
    queryKey: ["task", id, "report"],
    queryFn: () => fetchJSON<unknown>(`/api/v1/tasks/${id}/report`),
    enabled: !!id,
  });
}

export function useConfirmTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJSON<unknown>(`/api/v1/tasks/${id}/confirm`, { method: "POST" }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task", id] });
    },
  });
}

export function useCompareTasks(stationId: string | undefined, taskIds: string[]) {
  return useQuery({
    queryKey: ["compare", stationId, taskIds],
    queryFn: () => fetchJSON<Task[]>(`/api/v1/stations/${stationId}/tasks/compare?task_ids=${taskIds.join(",")}`),
    enabled: !!stationId && taskIds.length >= 2,
  });
}
