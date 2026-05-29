const ENGINE_API_URL =
  process.env.NEXT_PUBLIC_ENGINE_API_URL || "http://localhost:8000";

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const res = await fetch(`${ENGINE_API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Stations
  stations: {
    list: () => request<unknown[]>("/api/v1/stations"),
    get: (id: string) => request<unknown>(`/api/v1/stations/${id}`),
    create: (data: unknown) =>
      request<unknown>("/api/v1/stations", { method: "POST", body: data }),
    update: (id: string, data: unknown) =>
      request<unknown>(`/api/v1/stations/${id}`, { method: "PUT", body: data }),
    delete: (id: string) =>
      request<void>(`/api/v1/stations/${id}`, { method: "DELETE" }),
  },

  // Tasks
  tasks: {
    list: (stationId?: string) =>
      request<unknown[]>(
        `/api/v1/tasks${stationId ? `?station_id=${stationId}` : ""}`
      ),
    get: (id: string) => request<unknown>(`/api/v1/tasks/${id}`),
    create: (data: unknown) =>
      request<unknown>("/api/v1/tasks", { method: "POST", body: data }),
    status: (id: string) =>
      request<{ status: string; progress: number }>(
        `/api/v1/tasks/${id}/status`
      ),
    confirm: (id: string) =>
      request<unknown>(`/api/v1/tasks/${id}/confirm`, { method: "POST" }),
    losses: (id: string) =>
      request<unknown>(`/api/v1/tasks/${id}/losses`),
    faults: (id: string) =>
      request<unknown>(`/api/v1/tasks/${id}/faults`),
    report: (id: string) =>
      request<unknown>(`/api/v1/tasks/${id}/report`),
    reAnalyze: (id: string) =>
      request<unknown>(`/api/v1/tasks/${id}/re-analyze`, { method: "POST" }),
    compare: (stationId: string, taskIds: string[]) =>
      request<unknown>(
        `/api/v1/stations/${stationId}/tasks/compare?task_ids=${taskIds.join(",")}`
      ),
    export: {
      pdf: (id: string) =>
        request<{ file_path: string }>(`/api/v1/tasks/${id}/export/pdf`, {
          method: "POST",
        }),
      excel: (id: string) =>
        request<{ file_path: string }>(`/api/v1/tasks/${id}/export/excel`, {
          method: "POST",
        }),
    },
  },

  // AI
  ai: {
    suggestFields: (data: unknown) =>
      request<unknown>("/api/v1/ai/suggest-fields", {
        method: "POST",
        body: data,
      }),
    suggestProgressive: (data: unknown) =>
      request<unknown>("/api/v1/ai/suggest-progressive", {
        method: "POST",
        body: data,
      }),
  },
};
